# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os

config = {
    #########################################################################
    ######## LINUX GENERIC CONFIG KEYS/VAlUES
    # if you are updating this with custom 32 bit keys/values please add them
    # below under the '32 bit specific' code block otherwise, update in this
    # code block and also make sure this is synced with
    # releng_base_linux_64_builds.py
    # note: overridden by MOZHARNESS_ACTIONS in TaskCluster tasks
    "default_actions": [
        "clobber",
        "build",
    ],
    "secret_files": [
        {
            "filename": "/builds/gls-gapi.data",
            "secret_name": "project/releng/gecko/build/level-%(scm-level)s/gls-gapi.data",
            "min_scm_level": 1,
        },
        {
            "filename": "/builds/sb-gapi.data",
            "secret_name": "project/releng/gecko/build/level-%(scm-level)s/sb-gapi.data",
            "min_scm_level": 1,
        },
        {
            "filename": "/builds/mozilla-desktop-geoloc-api.key",
            "secret_name": "project/releng/gecko/build/level-%(scm-level)s/mozilla-desktop-geoloc-api.key",
            "min_scm_level": 2,
            "default": "try-build-has-no-secrets",
        },
    ],
    "vcs_share_base": "/builds/hg-shared",
    "upload_env": {
        "UPLOAD_PATH": "/builds/worker/artifacts",
    },
    "env": {
        "MOZBUILD_STATE_PATH": os.path.join(os.getcwd(), ".mozbuild"),
        "DISPLAY": ":2",
        "HG_SHARE_BASE_DIR": "/builds/hg-shared",
        "MOZ_OBJDIR": "%(abs_obj_dir)s",
        "TINDERBOX_OUTPUT": "1",
        "TOOLTOOL_CACHE": "/builds/worker/tooltool-cache",
        "TOOLTOOL_HOME": "/builds",
        "MOZ_CRASHREPORTER_NO_REPORT": "1",
        "LC_ALL": "C",
        "PATH": "/usr/local/bin:/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/sbin",
    },
    "mozconfig_variant": "nightly",
    #########################################################################
    #########################################################################
    ###### 32 bit specific ######
    "platform": "linux",
    "stage_platform": "linux",
    "mozconfig_platform": "linux32",
    #########################################################################
}
