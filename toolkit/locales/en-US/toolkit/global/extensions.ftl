# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

## Headers used in the webextension permissions dialog,
## See https://bug1308309.bmoattachments.org/attachment.cgi?id=8814612
## for an example of the full dialog.
## Note: This string will be used as raw markup. Avoid characters like <, >, &
## Variables:
##   $extension (String): replaced with the localized name of the extension.

webext-perms-header2 = Add { $extension }
webext-perms-list-intro-unsigned = This unverified extension might put your privacy at risk or compromise your device. Only add it if you trust the source.
webext-perms-sideload-header = { $extension } added
webext-perms-optional-perms-header2 = { $extension } requests additional permissions

## Headers used in the webextension permissions dialog, inside the content.

webext-perms-header-required-perms = Required permissions:
webext-perms-header-optional-settings = Optional settings:

webext-perms-header-update-required-perms = New required permissions:

webext-perms-header-optional-required-perms = New permissions:

webext-perms-header-data-collection-perms = Required data collection:
webext-perms-header-data-collection-is-none = Data collection:

# This is a header used in the add-ons "update" prompt, shown when the new
# version requires new data collection permissions.
webext-perms-header-update-data-collection-perms = New required data collection:

# This is a header used in the add-ons "optional" prompt, shown when the
# extension requests new data collection permissions programmatically.
webext-perms-header-optional-data-collection-perms = New data collection:

##

webext-perms-add =
    .label = Add
    .accesskey = A
webext-perms-cancel =
    .label = Cancel
    .accesskey = C

webext-perms-sideload-text = Another program on your computer installed an add-on that may affect your browser. Please review this add-on’s permissions requests and choose to Enable or Cancel (to leave it disabled).
webext-perms-sideload-text-no-perms = Another program on your computer installed an add-on that may affect your browser. Please choose to Enable or Cancel (to leave it disabled).
webext-perms-sideload-enable =
    .label = Enable
    .accesskey = E
webext-perms-sideload-cancel =
    .label = Cancel
    .accesskey = C

# Variables:
#   $extension (String): replaced with the localized name of the extension.
webext-perms-update-text2 = { $extension } has been updated. You must approve new permissions before the updated version will install. Choosing “Cancel” will maintain your current extension version.
webext-perms-update-accept =
    .label = Update
    .accesskey = U

webext-perms-optional-perms-list-intro = It wants to:
webext-perms-optional-perms-allow =
    .label = Allow
    .accesskey = A
webext-perms-optional-perms-deny =
    .label = Deny
    .accesskey = D

webext-perms-host-description-all-urls = Access your data for all websites

# Variables:
#   $domain (String): will be replaced by the DNS domain for which a webextension is requesting access (e.g., mozilla.org)
webext-perms-host-description-wildcard = Access your data for sites in the { $domain } domain

# Variables:
#   $domain (String): will be replaced by the DNS host name for which a webextension is requesting access (e.g., www.mozilla.org)
webext-perms-host-description-one-site = Access your data for { $domain }

# Variables:
#   $domain (String): will be replaced by the DNS host name for which a webextension is requesting access (e.g., mozilla.org),
#     $domain should be treated as plural (because it may also include all subdomains, e.g www.mozilla.org, ftp.mozilla.org).
webext-perms-host-description-one-domain = Access your data for sites in { $domain } domains

# Permission string used for webextensions requesting access to 2 or more domains (and so $domainCount is expected to always
# be >= 2, for webextensions requesting access to only one domain the `webext-perms-host-description-one-domain` string is
# used instead).
# Variables:
#   $domainCount (Number): Integer indicating the number of websites domains for which this webextension is requesting permission
#     (the list of domains will follow this string).
webext-perms-host-description-multiple-domains =
    { $domainCount ->
       *[other] Access your data for sites in { $domainCount } domains
    }

## Strings for data collection permissions in the permission prompt.

webext-perms-description-data-none = The developer says this extension doesn’t require data collection.

# Variables:
#    $permissions (String): a list of data collection permissions formatted with `Intl.ListFormat` using the "narrow" style.
webext-perms-description-data-some = The developer says this extension collects: { $permissions }

# Variables:
#    $permissions (String): a list of data collection permissions formatted with `Intl.ListFormat` using the "narrow" style.
webext-perms-description-data-some-update = The developer says the extension will collect: { $permissions }

# Variables:
#    $permissions (String): a list of data collection permissions formatted with `Intl.ListFormat` using the "narrow" style.
webext-perms-description-data-some-optional = The developer says the extension wants to collect: { $permissions }

# Variables:
#   $extension (String): replaced with the localized name of the extension.
webext-perms-update-text-with-data-collection = { $extension } requires new settings to update

webext-perms-update-list-intro-with-data-collection = Cancel to keep your current version and settings, or update to get the new version and approve the changes.

# Variables:
#   $extension (String): replaced with the localized name of the extension.
webext-perms-optional-text-with-data-collection = { $extension } requests additional settings

# Variables:
#   $extension (String): replaced with the localized name of the extension.
webext-perms-optional-text-with-data-collection-only = { $extension } requests additional data collection

## Headers used in the webextension permissions dialog for synthetic add-ons.
## The part of the string describing what privileges the extension gives should be consistent
## with the value of webext-site-perms-description-gated-perms-{sitePermission}.
## Note, this string will be used as raw markup. Avoid characters like <, >, &
## Variables:
##   $hostname (String): the hostname of the site the add-on is being installed from.

webext-site-perms-header-with-gated-perms-midi = This add-on gives { $hostname } access to your MIDI devices.
webext-site-perms-header-with-gated-perms-midi-sysex = This add-on gives { $hostname } access to your MIDI devices (with SysEx support).

##

# This string is used as description in the webextension permissions dialog for synthetic add-ons.
# Note, the empty line is used to create a line break between the two sections.
# Note, this string will be used as raw markup. Avoid characters like <, >, &
webext-site-perms-description-gated-perms-midi =
    These are usually plug-in devices like audio synthesizers, but might also be built into your computer.

    Websites are normally not allowed to access MIDI devices. Improper usage could cause damage or compromise security.

## Headers used in the webextension permissions dialog.
## Note: This string will be used as raw markup. Avoid characters like <, >, &
## Variables:
##   $extension (String): replaced with the localized name of the extension being installed.
##   $hostname (String): will be replaced by the DNS host name for which a webextension enables permissions.

webext-site-perms-header-with-perms = Add { $extension }? This extension grants the following capabilities to { $hostname }:
webext-site-perms-header-unsigned-with-perms = Add { $extension }? This extension is unverified. Malicious extensions can steal your private information or compromise your computer. Only add it if you trust the source. This extension grants the following capabilities to { $hostname }:

## These should remain in sync with permissions.NAME.label in sitePermissions.properties

webext-site-perms-midi = Access MIDI devices
webext-site-perms-midi-sysex = Access MIDI devices with SysEx support

## Colorway theme migration

webext-colorway-theme-migration-notification-message = <b>Your colorway theme was removed.</b> { -brand-shorter-name } updated its colorways collection. You can find the latest versions on the add-ons site.
webext-colorway-theme-migration-notification-button = Get updated colorways
