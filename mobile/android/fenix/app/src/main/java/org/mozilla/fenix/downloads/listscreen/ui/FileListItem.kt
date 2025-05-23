/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads.listscreen.ui

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.menu.DropdownMenu
import mozilla.components.compose.base.menu.MenuItem
import mozilla.components.compose.base.text.Text
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.list.SelectableListItem
import org.mozilla.fenix.downloads.listscreen.DownloadsListTestTag
import org.mozilla.fenix.downloads.listscreen.store.FileItem
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * [SelectableListItem] used for displaying download items on the downloads screen.
 *
 * @param fileItem [FileItem] representing a download item.
 * @param isSelected The selected state of the item.
 * @param isMenuIconVisible Whether the menu icon is visible on the download item.
 * @param modifier Modifier to be applied to the [SelectableListItem].
 * @param onDeleteClick Invoked when delete is clicked.
 * @param onShareUrlClick Invoked when share URL is clicked.
 * @param onShareFileClick Invoked when share file is clicked.
 */
@Composable
internal fun FileListItem(
    fileItem: FileItem,
    isSelected: Boolean,
    isMenuIconVisible: Boolean,
    modifier: Modifier = Modifier,
    onDeleteClick: (FileItem) -> Unit,
    onShareUrlClick: (FileItem) -> Unit,
    onShareFileClick: (FileItem) -> Unit,
) {
    SelectableListItem(
        label = fileItem.fileName ?: fileItem.url,
        description = fileItem.description,
        isSelected = isSelected,
        icon = fileItem.icon,
        afterListAction = {
            if (isMenuIconVisible) {
                var menuExpanded by remember { mutableStateOf(false) }

                Spacer(modifier = Modifier.width(16.dp))

                IconButton(
                    onClick = { menuExpanded = true },
                    modifier = Modifier
                        .size(24.dp)
                        .testTag("${DownloadsListTestTag.DOWNLOADS_LIST_ITEM_MENU}.${fileItem.fileName}"),
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.mozac_ic_ellipsis_vertical_24),
                        contentDescription = stringResource(id = R.string.content_description_menu),
                        tint = FirefoxTheme.colors.iconPrimary,
                    )

                    DropdownMenu(
                        menuItems = listOf(
                            MenuItem.TextItem(
                                text = Text.Resource(R.string.download_share_url),
                                onClick = { onShareUrlClick(fileItem) },
                                level = MenuItem.FixedItem.Level.Default,
                            ),
                            MenuItem.TextItem(
                                text = Text.Resource(R.string.download_share_file),
                                onClick = { onShareFileClick(fileItem) },
                                level = MenuItem.FixedItem.Level.Default,
                            ),
                            MenuItem.TextItem(
                                text = Text.Resource(R.string.download_delete_item),
                                onClick = { onDeleteClick(fileItem) },
                                level = MenuItem.FixedItem.Level.Critical,
                            ),
                        ),
                        expanded = menuExpanded,
                        onDismissRequest = { menuExpanded = false },
                    )
                }
            }
        },
        modifier = modifier,
    )
}
