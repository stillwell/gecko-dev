export const description = `Test that variables in the shader are value initialized`;

import { makeTestGroup } from '../../../common/framework/test_group.js';
import { AllFeaturesMaxLimitsGPUTest, GPUTest } from '../../gpu_test.js';
import { Type } from '../../util/conversion.js';

export const g = makeTestGroup(AllFeaturesMaxLimitsGPUTest);

function generateShader(
  isF16: boolean,
  addressSpace: string,
  typeDecl: string,
  testValue: string,
  comparison: string
): string {
  let moduleScope = `
    ${isF16 ? 'enable f16;' : ''}
    struct Output {
      failed : atomic<u32>
    }
    @group(0) @binding(0) var<storage, read_write> output : Output;
  `;

  let functionScope = '';
  switch (addressSpace) {
    case 'private':
      moduleScope += `\nvar<private> testVar: ${typeDecl} = ${testValue};`;
      break;
    case 'function':
      functionScope += `\nvar testVar: ${typeDecl} = ${testValue};`;
      break;
  }

  return `
    ${moduleScope}
    @compute @workgroup_size(1, 1, 1)
    fn main() {
      ${functionScope}
      ${comparison}
    }
  `;
}

async function run(t: GPUTest, wgsl: string) {
  const pipeline = await t.device.createComputePipelineAsync({
    layout: 'auto',
    compute: {
      module: t.device.createShaderModule({
        code: wgsl,
      }),
      entryPoint: 'main',
    },
  });

  const resultBuffer = t.createBufferTracked({
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const bindGroup = t.device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: resultBuffer,
        },
      },
    ],
  });

  const encoder = t.device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(1);
  pass.end();
  t.queue.submit([encoder.finish()]);
  t.expectGPUBufferValuesEqual(resultBuffer, new Uint32Array([0]));
}

g.test('scalars')
  .desc(`Test that scalars in private, and function storage classes can be initialized to a value.`)
  .params(u =>
    u
      .combine('addressSpace', ['private', 'function'] as const)
      .combine('type', ['bool', 'f32', 'f16', 'i32', 'u32'] as const)
  )
  .fn(async t => {
    const typeDecl = t.params.type;
    if (typeDecl === 'f16') {
      t.skipIfDeviceDoesNotHaveFeature('shader-f16');
    }
    const testValue = Type[typeDecl].create(5).wgsl();

    const comparison = `if (testVar != ${testValue}) {
      atomicStore(&output.failed, 1u);
    }`;
    const wgsl = generateShader(
      t.params.type === 'f16',
      t.params.addressSpace,
      typeDecl,
      testValue,
      comparison
    );

    await run(t, wgsl);
  });

g.test('vec')
  .desc(`Test that vectors in private, and function storage classes can be initialized to a value.`)
  .params(u =>
    u
      .combine('addressSpace', ['private', 'function'] as const)
      .combine('type', ['bool', 'f32', 'f16', 'i32', 'u32'] as const)
      .combine('count', [2, 3, 4] as const)
  )
  .fn(async t => {
    if (t.params.type === 'f16') {
      t.skipIfDeviceDoesNotHaveFeature('shader-f16');
    }
    const typeDecl = `vec${t.params.count}<${t.params.type}>`;
    const testValue = `${typeDecl}(${Type[t.params.type].create(5).wgsl()})`;
    const comparison = `if (!all(testVar == ${testValue})) {
      atomicStore(&output.failed, 1u);
    }`;
    const wgsl = generateShader(
      t.params.type === 'f16',
      t.params.addressSpace,
      typeDecl,
      testValue,
      comparison
    );

    await run(t, wgsl);
  });

g.test('mat')
  .desc(
    `Test that matrices in private, and function storage classes can be initialized to a value.`
  )
  .params(u =>
    u
      .combine('addressSpace', ['private', 'function'] as const)
      .combine('type', ['f32', 'f16'] as const)
      .beginSubcases()
      .combine('c', [2, 3, 4] as const)
      .combine('r', [2, 3, 4] as const)
  )
  .fn(async t => {
    if (t.params.type === 'f16') {
      t.skipIfDeviceDoesNotHaveFeature('shader-f16');
    }
    const typeDecl = `mat${t.params.c}x${t.params.r}<${t.params.type}>`;
    const testScalarValue = Type[t.params.type].create(5).wgsl();

    let testValue = `${typeDecl}(`;
    for (let c = 0; c < t.params.c; c++) {
      for (let r = 0; r < t.params.r; r++) {
        testValue += `${testScalarValue},`;
      }
    }
    testValue += ')';

    const comparison = `for ( var i = 0; i < ${t.params.c}; i++) {
      for (var k = 0; k < ${t.params.r}; k++) {
        if (testVar[i][k] != ${testScalarValue}) {
          atomicStore(&output.failed, 1u);
        }
      }
    }`;
    const wgsl = generateShader(
      t.params.type === 'f16',
      t.params.addressSpace,
      typeDecl,
      testValue,
      comparison
    );

    await run(t, wgsl);
  });

g.test('array')
  .desc(`Test that arrays in private, and function storage classes can be initialized to a value.`)
  .params(u =>
    u
      .combine('addressSpace', ['private', 'function'] as const)
      .combine('type', ['bool', 'i32', 'u32', 'f32', 'f16'] as const)
  )
  .fn(async t => {
    if (t.params.type === 'f16') {
      t.skipIfDeviceDoesNotHaveFeature('shader-f16');
    }
    const arraySize = 4;
    const typeDecl = `array<${t.params.type}, ${arraySize}>`;

    const testScalarValue = Type[t.params.type].create(5).wgsl();

    let testValue = `${typeDecl}(`;
    for (let i = 0; i < arraySize; i++) {
      testValue += `${testScalarValue},`;
    }
    testValue += ')';

    const comparison = `for ( var i = 0; i < ${arraySize}; i++) {
      if (testVar[i] != ${testScalarValue}) {
        atomicStore(&output.failed, 1u);
      }
    }`;
    const wgsl = generateShader(
      t.params.type === 'f16',
      t.params.addressSpace,
      typeDecl,
      testValue,
      comparison
    );

    await run(t, wgsl);
  });

g.test('array,nested')
  .desc(`Test that arrays in private, and function storage classes can be initialized to a value.`)
  .params(u =>
    u
      .combine('addressSpace', ['private', 'function'] as const)
      .combine('type', ['bool', 'i32', 'u32', 'f32', 'f16'] as const)
  )
  .fn(async t => {
    if (t.params.type === 'f16') {
      t.skipIfDeviceDoesNotHaveFeature('shader-f16');
    }
    const arraySize = 4;

    const innerDecl = `array<${t.params.type}, ${arraySize}>`;
    const typeDecl = `array<${innerDecl}, ${arraySize}>`;

    const testScalarValue = Type[t.params.type].create(5).wgsl();

    let testValue = `${typeDecl}(`;
    for (let i = 0; i < arraySize; i++) {
      testValue += `${innerDecl}(`;
      for (let j = 0; j < arraySize; j++) {
        testValue += `${testScalarValue},`;
      }
      testValue += `),`;
    }
    testValue += ')';

    const comparison = `
    for ( var i = 0; i < ${arraySize}; i++) {
      for ( var k = 0; k < ${arraySize}; k++) {
        if (testVar[i][k] != ${testScalarValue}) {
          atomicStore(&output.failed, 1u);
        }
      }
    }
    `;
    const wgsl = generateShader(
      t.params.type === 'f16',
      t.params.addressSpace,
      typeDecl,
      testValue,
      comparison
    );

    await run(t, wgsl);
  });

g.test('struct')
  .desc(`Test that structs in private, and function storage classes can be initialized to a value.`)
  .params(u => u.combine('addressSpace', ['private', 'function'] as const))
  .fn(async t => {
    let moduleScope = `
    struct Output {
      failed : atomic<u32>
    }
    @group(0) @binding(0) var<storage, read_write> output : Output;

    struct A {
        a: i32,
        b: f32,
    }

    struct S {
        c: f32,
        d: A,
        e: array<i32, 2>,
    }
  `;

    const typeDecl = 'S';
    const testValue = 'S(5.f, A(5i, 5.f), array<i32, 2>(5i, 5i))';

    let functionScope = '';
    switch (t.params.addressSpace) {
      case 'private':
        moduleScope += `\nvar<private> testVar: ${typeDecl} = ${testValue};`;
        break;
      case 'function':
        functionScope += `\nvar testVar: ${typeDecl} = ${testValue};`;
        break;
    }

    const comparison = `
    if (testVar.c != 5f || testVar.d.a != 5i || testVar.d.b != 5.f || testVar.e[0] != 5i || testVar.e[1] != 5i) {
      atomicStore(&output.failed, 1u);
    }
    `;

    const wgsl = `
      ${moduleScope}
      @compute @workgroup_size(1, 1, 1)
      fn main() {
        ${functionScope}
        ${comparison}
      }
    `;

    await run(t, wgsl);
  });
