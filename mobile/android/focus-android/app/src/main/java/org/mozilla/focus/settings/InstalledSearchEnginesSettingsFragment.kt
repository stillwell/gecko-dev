/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.settings

import android.os.Bundle
import android.view.Menu
import android.view.MenuInflater
import android.view.MenuItem
import androidx.preference.Preference
import mozilla.components.browser.state.state.SearchState
import mozilla.components.browser.state.state.availableSearchEngines
import mozilla.components.browser.state.state.searchEngines
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.feature.search.SearchUseCases
import mozilla.telemetry.glean.private.NoExtras
import org.mozilla.focus.GleanMetrics.SearchEngines
import org.mozilla.focus.R
import org.mozilla.focus.ext.requireComponents
import org.mozilla.focus.ext.showToolbar
import org.mozilla.focus.search.RadioSearchEngineListPreference
import org.mozilla.focus.state.AppAction
import org.mozilla.focus.state.Screen
import kotlin.collections.forEach as withEach

class InstalledSearchEnginesSettingsFragment : BaseSettingsFragment() {
    override fun onCreatePreferences(p0: Bundle?, p1: String?) {
        //
    }

    companion object {
        var languageChanged: Boolean = false
    }

    override fun onResume() {
        super.onResume()

        showToolbar(getString(R.string.preference_choose_search_engine))

        if (languageChanged) {
            restoreSearchEngines()
        } else {
            refetchSearchEngines()
        }
    }

    override fun onCreateMenu(menu: Menu, menuInflater: MenuInflater) {
        super.onCreateMenu(menu, menuInflater)
        menuInflater.inflate(R.menu.menu_search_engines, menu)
    }

    override fun onPrepareMenu(menu: Menu) {
        super.onPrepareMenu(menu)
        menu.findItem(R.id.menu_restore_default_engines)?.let {
            it.isEnabled = !requireComponents.store.state.search.hasDefaultSearchEnginesOnly()
        }
    }

    override fun onMenuItemSelected(menuItem: MenuItem): Boolean {
        val currentEnginesCount = requireComponents.store.state.search.searchEngines.size

        return when (menuItem.itemId) {
            R.id.menu_remove_search_engines -> {
                requireComponents.appStore.dispatch(
                    AppAction.OpenSettings(Screen.Settings.Page.SearchRemove),
                )
                SearchEngines.openRemoveScreen.record(
                    SearchEngines.OpenRemoveScreenExtra(currentEnginesCount),
                )

                true
            }
            R.id.menu_restore_default_engines -> {
                restoreSearchEngines()
                SearchEngines.restoreDefaultEngines.record(
                    SearchEngines.RestoreDefaultEnginesExtra(currentEnginesCount),
                )
                true
            }
            else -> false
        }
    }

    private fun restoreSearchEngines() {
        restoreSearchDefaults(requireComponents.store, requireComponents.searchUseCases)
        refetchSearchEngines()
        languageChanged = false
    }

    override fun onPreferenceTreeClick(preference: Preference): Boolean {
        return when (preference.key) {
            resources.getString(R.string.pref_key_manual_add_search_engine) -> {
                requireComponents.appStore.dispatch(
                    AppAction.OpenSettings(page = Screen.Settings.Page.SearchAdd),
                )
                SearchEngines.addEngineTapped.record(NoExtras())

                return true
            }
            else -> {
                super.onPreferenceTreeClick(preference)
            }
        }
    }

    /**
     * Refresh search engines list.
     */
    private fun refetchSearchEngines() {
        // Refresh this preference screen to display changes.
        preferenceScreen?.removeAll()
        addPreferencesFromResource(R.xml.search_engine_settings)

        val pref: RadioSearchEngineListPreference? = preferenceScreen.findPreference(
            resources.getString(R.string.pref_key_radio_search_engine_list),
        )
        pref?.refetchSearchEngines()
    }
}

private fun SearchState.hasDefaultSearchEnginesOnly(): Boolean {
    return availableSearchEngines.isEmpty() && additionalSearchEngines.isEmpty() && customSearchEngines.isEmpty()
}

private fun restoreSearchDefaults(store: BrowserStore, useCases: SearchUseCases) {
    store.state.search.customSearchEngines.withEach { searchEngine ->
        useCases.removeSearchEngine(
            searchEngine,
        )
    }
    store.state.search.hiddenSearchEngines.withEach { searchEngine ->
        useCases.addSearchEngine(
            searchEngine,
        )
    }
}
