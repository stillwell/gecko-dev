/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! Conic gradients
//!
//! Specification: https://drafts.csswg.org/css-images-4/#conic-gradients
//!
//! Conic gradients are rendered via cached render tasks and composited with the image brush.

use euclid::vec2;
use api::{ColorF, ExtendMode, GradientStop, PremultipliedColorF};
use api::units::*;
use crate::pattern::{Pattern, PatternBuilder, PatternBuilderContext, PatternBuilderState, PatternKind, PatternShaderInput, PatternTextureInput};
use crate::scene_building::IsVisible;
use crate::frame_builder::FrameBuildingState;
use crate::intern::{Internable, InternDebug, Handle as InternHandle};
use crate::internal_types::LayoutPrimitiveInfo;
use crate::prim_store::{BrushSegment, GradientTileRange};
use crate::prim_store::{PrimitiveInstanceKind, PrimitiveOpacity, FloatKey};
use crate::prim_store::{PrimKeyCommonData, PrimTemplateCommonData, PrimitiveStore};
use crate::prim_store::{NinePatchDescriptor, PointKey, SizeKey, InternablePrimitive};
use crate::render_task::{RenderTask, RenderTaskKind};
use crate::render_task_graph::RenderTaskId;
use crate::render_task_cache::{RenderTaskCacheKeyKind, RenderTaskCacheKey, RenderTaskParent};
use crate::renderer::{GpuBufferAddress, GpuBufferBuilder};

use std::{hash, ops::{Deref, DerefMut}};
use super::{stops_and_min_alpha, GradientStopKey, GradientGpuBlockBuilder};

/// Hashable conic gradient parameters, for use during prim interning.
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
#[derive(Debug, Clone, MallocSizeOf, PartialEq)]
pub struct ConicGradientParams {
    pub angle: f32, // in radians
    pub start_offset: f32,
    pub end_offset: f32,
}

impl Eq for ConicGradientParams {}

impl hash::Hash for ConicGradientParams {
    fn hash<H: hash::Hasher>(&self, state: &mut H) {
        self.angle.to_bits().hash(state);
        self.start_offset.to_bits().hash(state);
        self.end_offset.to_bits().hash(state);
    }
}

/// Identifying key for a line decoration.
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
#[derive(Debug, Clone, Eq, PartialEq, Hash, MallocSizeOf)]
pub struct ConicGradientKey {
    pub common: PrimKeyCommonData,
    pub extend_mode: ExtendMode,
    pub center: PointKey,
    pub params: ConicGradientParams,
    pub stretch_size: SizeKey,
    pub stops: Vec<GradientStopKey>,
    pub tile_spacing: SizeKey,
    pub nine_patch: Option<Box<NinePatchDescriptor>>,
}

impl ConicGradientKey {
    pub fn new(
        info: &LayoutPrimitiveInfo,
        conic_grad: ConicGradient,
    ) -> Self {
        ConicGradientKey {
            common: info.into(),
            extend_mode: conic_grad.extend_mode,
            center: conic_grad.center,
            params: conic_grad.params,
            stretch_size: conic_grad.stretch_size,
            stops: conic_grad.stops,
            tile_spacing: conic_grad.tile_spacing,
            nine_patch: conic_grad.nine_patch,
        }
    }
}

impl InternDebug for ConicGradientKey {}

#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
#[derive(MallocSizeOf)]
pub struct ConicGradientTemplate {
    pub common: PrimTemplateCommonData,
    pub extend_mode: ExtendMode,
    pub center: DevicePoint,
    pub params: ConicGradientParams,
    pub task_size: DeviceIntSize,
    pub scale: DeviceVector2D,
    pub stretch_size: LayoutSize,
    pub tile_spacing: LayoutSize,
    pub brush_segments: Vec<BrushSegment>,
    pub stops_opacity: PrimitiveOpacity,
    pub stops: Vec<GradientStop>,
    pub src_color: Option<RenderTaskId>,
}

impl PatternBuilder for ConicGradientTemplate {
    fn build(
        &self,
        _sub_rect: Option<DeviceRect>,
        _ctx: &PatternBuilderContext,
        state: &mut PatternBuilderState,
    ) -> Pattern {
        // The scaling parameter is used to compensate for when we reduce the size
        // of the render task for cached gradients. Here we aren't applying any.
        let no_scale = DeviceVector2D::one();

        conic_gradient_pattern(
            self.center,
            no_scale,
            &self.params,
            self.extend_mode,
            &self.stops,
            state.frame_gpu_data,
        )
    }

    fn get_base_color(
        &self,
        _ctx: &PatternBuilderContext,
    ) -> ColorF {
        ColorF::WHITE
    }

    fn use_shared_pattern(
        &self,
    ) -> bool {
        true
    }
}

impl Deref for ConicGradientTemplate {
    type Target = PrimTemplateCommonData;
    fn deref(&self) -> &Self::Target {
        &self.common
    }
}

impl DerefMut for ConicGradientTemplate {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.common
    }
}

impl From<ConicGradientKey> for ConicGradientTemplate {
    fn from(item: ConicGradientKey) -> Self {
        let common = PrimTemplateCommonData::with_key_common(item.common);
        let mut brush_segments = Vec::new();

        if let Some(ref nine_patch) = item.nine_patch {
            brush_segments = nine_patch.create_segments(common.prim_rect.size());
        }

        let (stops, min_alpha) = stops_and_min_alpha(&item.stops);

        // Save opacity of the stops for use in
        // selecting which pass this gradient
        // should be drawn in.
        let stops_opacity = PrimitiveOpacity::from_alpha(min_alpha);

        let mut stretch_size: LayoutSize = item.stretch_size.into();
        stretch_size.width = stretch_size.width.min(common.prim_rect.width());
        stretch_size.height = stretch_size.height.min(common.prim_rect.height());

        fn approx_eq(a: f32, b: f32) -> bool { (a - b).abs() < 0.01 }

        // Attempt to detect some of the common configurations with hard gradient stops. Allow
        // those a higher maximum resolution to avoid the worst cases of aliasing artifacts with
        // large conic gradients. A better solution would be to go back to rendering very large
        // conic gradients via a brush shader instead of caching all of them (unclear whether
        // it is important enough to warrant the better solution).
        let mut has_hard_stops = false;
        let mut prev_stop = None;
        let offset_range = item.params.end_offset - item.params.start_offset;
        for stop in &stops {
            if offset_range <= 0.0 {
                break;
            }
            if let Some(prev_offset) = prev_stop {
                // Check whether two consecutive stops are very close (hard stops).
                if stop.offset < prev_offset + 0.005 / offset_range {
                    // a is the angle of the stop normalized into 0-1 space and repeating in the 0-0.25 range.
                    // If close to 0.0 or 0.25 it means the stop is vertical or horizontal. For those, the lower
                    // resolution isn't a big issue.
                    let a = item.params.angle / (2.0 * std::f32::consts::PI)
                        + item.params.start_offset
                        + stop.offset / offset_range;
                    let a = a.rem_euclid(0.25);

                    if !approx_eq(a, 0.0) && !approx_eq(a, 0.25) {
                        has_hard_stops = true;
                        break;
                    }
                }
            }
            prev_stop = Some(stop.offset);
        }

        let max_size = if has_hard_stops {
            2048.0
        } else {
            1024.0
        };

        // Avoid rendering enormous gradients. Radial gradients are mostly made of soft transitions,
        // so it is unlikely that rendering at a higher resolution that 1024 would produce noticeable
        // differences, especially with 8 bits per channel.
        let mut task_size: DeviceSize = stretch_size.cast_unit();
        let mut scale = vec2(1.0, 1.0);
        if task_size.width > max_size {
            scale.x = task_size.width / max_size;
            task_size.width = max_size;
        }
        if task_size.height > max_size {
            scale.y = task_size.height / max_size;
            task_size.height = max_size;
        }

        ConicGradientTemplate {
            common,
            center: DevicePoint::new(item.center.x, item.center.y),
            extend_mode: item.extend_mode,
            params: item.params,
            stretch_size,
            task_size: task_size.ceil().to_i32(),
            scale,
            tile_spacing: item.tile_spacing.into(),
            brush_segments,
            stops_opacity,
            stops,
            src_color: None,
        }
    }
}

impl ConicGradientTemplate {
    /// Update the GPU cache for a given primitive template. This may be called multiple
    /// times per frame, by each primitive reference that refers to this interned
    /// template. The initial request call to the GPU cache ensures that work is only
    /// done if the cache entry is invalid (due to first use or eviction).
    pub fn update(
        &mut self,
        frame_state: &mut FrameBuildingState,
    ) {
        if let Some(mut request) =
            frame_state.gpu_cache.request(&mut self.common.gpu_cache_handle) {
            // write_prim_gpu_blocks
            request.push(PremultipliedColorF::WHITE);
            request.push(PremultipliedColorF::WHITE);
            request.push([
                self.stretch_size.width,
                self.stretch_size.height,
                0.0,
                0.0,
            ]);

            // write_segment_gpu_blocks
            for segment in &self.brush_segments {
                // has to match VECS_PER_SEGMENT
                request.write_segment(
                    segment.local_rect,
                    segment.extra_data,
                );
            }
        }

        let cache_key = ConicGradientCacheKey {
            size: self.task_size,
            center: PointKey { x: self.center.x, y: self.center.y },
            scale: PointKey { x: self.scale.x, y: self.scale.y },
            start_offset: FloatKey(self.params.start_offset),
            end_offset: FloatKey(self.params.end_offset),
            angle: FloatKey(self.params.angle),
            extend_mode: self.extend_mode,
            stops: self.stops.iter().map(|stop| (*stop).into()).collect(),
        };

        let task_id = frame_state.resource_cache.request_render_task(
            Some(RenderTaskCacheKey {
                size: self.task_size,
                kind: RenderTaskCacheKeyKind::ConicGradient(cache_key),
            }),
            false,
            RenderTaskParent::Surface,
            frame_state.gpu_cache,
            &mut frame_state.frame_gpu_data.f32,
            frame_state.rg_builder,
            &mut frame_state.surface_builder,
            &mut |rg_builder, gpu_buffer_builder, _| {
                let stops = GradientGpuBlockBuilder::build(
                    false,
                    gpu_buffer_builder,
                    &self.stops,
                );

                rg_builder.add().init(RenderTask::new_dynamic(
                    self.task_size,
                    RenderTaskKind::ConicGradient(ConicGradientTask {
                        extend_mode: self.extend_mode,
                        scale: self.scale,
                        center: self.center,
                        params: self.params.clone(),
                        stops,
                    }),
                ))
            }
        );

        self.src_color = Some(task_id);

        // Tile spacing is always handled by decomposing into separate draw calls so the
        // primitive opacity is equivalent to stops opacity. This might change to being
        // set to non-opaque in the presence of tile spacing if/when tile spacing is handled
        // in the same way as with the image primitive.
        self.opacity = self.stops_opacity;
    }
}

pub type ConicGradientDataHandle = InternHandle<ConicGradient>;

#[derive(Debug, MallocSizeOf)]
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
pub struct ConicGradient {
    pub extend_mode: ExtendMode,
    pub center: PointKey,
    pub params: ConicGradientParams,
    pub stretch_size: SizeKey,
    pub stops: Vec<GradientStopKey>,
    pub tile_spacing: SizeKey,
    pub nine_patch: Option<Box<NinePatchDescriptor>>,
}

impl Internable for ConicGradient {
    type Key = ConicGradientKey;
    type StoreData = ConicGradientTemplate;
    type InternData = ();
    const PROFILE_COUNTER: usize = crate::profiler::INTERNED_CONIC_GRADIENTS;
}

impl InternablePrimitive for ConicGradient {
    fn into_key(
        self,
        info: &LayoutPrimitiveInfo,
    ) -> ConicGradientKey {
        ConicGradientKey::new(info, self)
    }

    fn make_instance_kind(
        _key: ConicGradientKey,
        data_handle: ConicGradientDataHandle,
        _prim_store: &mut PrimitiveStore,
    ) -> PrimitiveInstanceKind {
        PrimitiveInstanceKind::ConicGradient {
            data_handle,
            visible_tiles_range: GradientTileRange::empty(),
            cached: true,
        }
    }
}

impl IsVisible for ConicGradient {
    fn is_visible(&self) -> bool {
        true
    }
}

#[derive(Debug)]
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
pub struct ConicGradientTask {
    pub extend_mode: ExtendMode,
    pub center: DevicePoint,
    pub scale: DeviceVector2D,
    pub params: ConicGradientParams,
    pub stops: GpuBufferAddress,
}

impl ConicGradientTask {
    pub fn to_instance(&self, target_rect: &DeviceIntRect) -> ConicGradientInstance {
        ConicGradientInstance {
            task_rect: target_rect.to_f32(),
            center: self.center,
            scale: self.scale,
            start_offset: self.params.start_offset,
            end_offset: self.params.end_offset,
            angle: self.params.angle,
            extend_mode: self.extend_mode as i32,
            gradient_stops_address: self.stops.as_int(),
        }
    }
}

/// The per-instance shader input of a radial gradient render task.
///
/// Must match the RADIAL_GRADIENT instance description in renderer/vertex.rs.
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
#[repr(C)]
#[derive(Clone, Debug)]
pub struct ConicGradientInstance {
    pub task_rect: DeviceRect,
    pub center: DevicePoint,
    pub scale: DeviceVector2D,
    pub start_offset: f32,
    pub end_offset: f32,
    pub angle: f32,
    pub extend_mode: i32,
    pub gradient_stops_address: i32,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq)]
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
pub struct ConicGradientCacheKey {
    pub size: DeviceIntSize,
    pub center: PointKey,
    pub scale: PointKey,
    pub start_offset: FloatKey,
    pub end_offset: FloatKey,
    pub angle: FloatKey,
    pub extend_mode: ExtendMode,
    pub stops: Vec<GradientStopKey>,
}

pub fn conic_gradient_pattern(
    center: DevicePoint,
    scale: DeviceVector2D,
    params: &ConicGradientParams,
    extend_mode: ExtendMode,
    stops: &[GradientStop],
    gpu_buffer_builder: &mut GpuBufferBuilder
) -> Pattern {
    let mut writer = gpu_buffer_builder.f32.write_blocks(2);
    writer.push_one([
        center.x,
        center.y,
        scale.x,
        scale.y,
    ]);
    writer.push_one([
        params.start_offset,
        params.end_offset,
        params.angle,
        if extend_mode == ExtendMode::Repeat { 1.0 } else { 0.0 }
    ]);
    let gradient_address = writer.finish();

    let stops_address = GradientGpuBlockBuilder::build(
        false,
        &mut gpu_buffer_builder.f32,
        &stops,
    );

    let is_opaque = stops.iter().all(|stop| stop.color.a >= 1.0);

    Pattern {
        kind: PatternKind::ConicGradient,
        shader_input: PatternShaderInput(
            gradient_address.as_int(),
            stops_address.as_int(),
        ),
        texture_input: PatternTextureInput::default(),
        base_color: ColorF::WHITE,
        is_opaque,
    }
}
