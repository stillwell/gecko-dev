/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.downloads

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.state.state.content.DownloadState
import mozilla.components.feature.downloads.DownloadDialogFragment.Companion.KEY_FILE_NAME
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@Suppress("Deprecation") // https://bugzilla.mozilla.org/show_bug.cgi?id=1953923
class DownloadDialogFragmentTest {

    private lateinit var dialog: DownloadDialogFragment
    private lateinit var download: DownloadState

    @Before
    fun setup() {
        dialog = object : DownloadDialogFragment() {}
        download = DownloadState(
            "http://ipv4.download.thinkbroadband.com/5MB.zip",
            "5MB.zip",
            "application/zip",
            5242880,
            userAgent = "Mozilla/5.0 (Linux; Android 7.1.1) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Focus/8.0 Chrome/69.0.3497.100 Mobile Safari/537.36",
        )
    }

    @Test
    fun `when setDownload must set download metadata`() {
        dialog.setDownload(download)

        assertNotNull(dialog.arguments)
        val fileName = dialog.arguments!!.getString(KEY_FILE_NAME)
        val url = dialog.arguments!!.getString(DownloadDialogFragment.KEY_URL)
        val contentLength = dialog.arguments!!.getLong(DownloadDialogFragment.KEY_CONTENT_LENGTH)

        assertEquals(fileName, download.fileName)
        assertEquals(url, download.url)
        assertEquals(contentLength, download.contentLength)
    }
}
