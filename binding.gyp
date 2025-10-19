{
  "targets": [
    {
      "target_name": "cron",
      "sources": ["src/addon/cron.cpp"],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "cflags_cc": [
        "-std=c++20",
        "-O3",
        "-march=native",
        "-flto=auto",
        "-fuse-linker-plugin",
        "-funroll-loops",
        "-fomit-frame-pointer",
        "-fdata-sections",
        "-ffunction-sections",
        "-fexceptions",
        "-Wno-deprecated-declarations",
        "-Wno-reorder",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-sign-compare"
      ],
      "defines": ["NAPI_CPP_EXCEPTIONS"],
      "ldflags": [
        "-Wl,--as-needed",
        "-Wl,--gc-sections"
      ]
    },
    {
      "target_name": "sticker",
      "sources": [ "src/addon/sticker.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags_cc": [
        "-std=c++17",
        "-O3",
        "-fexceptions",
        "-Wno-deprecated-declarations",
        "-Wno-reorder",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-sign-compare"
      ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "libraries": [
        "-lwebp",
        "-lwebpmux",
        "-lwebpdemux",
        "-lavformat",
        "-lavcodec",
        "-lavutil",
        "-lswresample",
        "-lswscale"
      ]
    },
    {
      "target_name": "converter",
      "sources": [ "src/addon/converter.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags_cc": [
        "-std=c++17",
        "-O3",
        "-fexceptions",
        "-Wno-deprecated-declarations",
        "-Wno-reorder",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-sign-compare"
      ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "libraries": [
        "-lavformat",
        "-lavcodec",
        "-lavutil",
        "-lswresample",
        "-lswscale"
      ]
    },
    {
      "target_name": "convertMedia",
      "sources": [ "src/addon/convertMedia.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags_cc": [
        "-std=c++17",
        "-O3",
        "-fexceptions",
        "-Wno-deprecated-declarations",
        "-Wno-reorder",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-sign-compare"
      ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "libraries": [
        "-lavformat",
        "-lavcodec",
        "-lavutil",
        "-lswscale"
      ]
    },
    {
      "target_name": "media",
      "sources": [ "src/addon/media.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags_cc": [
        "-std=c++17",
        "-O3",
        "-march=native",
        "-fexceptions",
        "-Wno-deprecated-declarations",
        "-Wno-reorder",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-sign-compare"
      ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "libraries": [
        "-lavformat",
        "-lavcodec",
        "-lavutil",
        "-lswscale",
        "-lswresample"
      ]
    },
    {
      "target_name": "fetch",
      "sources": ["src/addon/fetch.cpp"],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "cflags_cc": [
        "-std=c++20",
        "-O3",
        "-march=native",
        "-flto=auto",
        "-fuse-linker-plugin",
        "-funroll-loops",
        "-fomit-frame-pointer",
        "-fdata-sections",
        "-ffunction-sections",
        "-fexceptions",
        "-Wno-deprecated-declarations",
        "-Wno-unused-but-set-variable",
        "-Wno-reorder",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-sign-compare"
      ],
      "defines": [
        "NAPI_CPP_EXCEPTIONS",
        "CURL_STATICLIB",
        "CURL_DISABLE_VERBOSE_STRINGS",
        "CURL_DISABLE_DEBUG",
        "CURL_DISABLE_DICT",
        "CURL_DISABLE_TFTP",
        "CURL_DISABLE_RTSP"
      ],
      "ldflags": [
        "-Wl,--as-needed",
        "-Wl,--gc-sections"
      ],
      "libraries": [
        "-lcurl",
        "-lssl",
        "-lcrypto",
        "-lz",
        "-lnghttp2"
      ]
    }
  ]
}