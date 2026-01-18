const { series, src, dest, parallel, watch } = require("gulp");
const autoprefixer = require("gulp-autoprefixer");
const browsersync = require("browser-sync");
const CleanCSS = require("gulp-clean-css");
const concat = require("gulp-concat");
const fileinclude = require("gulp-file-include");
const del = require("del");
const newer = require("gulp-newer");
const rename = require("gulp-rename");
const sourcemaps = require("gulp-sourcemaps");
const sass = require("gulp-sass")(require("sass"));
const uglify = require("gulp-uglify");
const npmdist = require("gulp-npm-dist");
const rtlcss = require("gulp-rtlcss");

const paths = {
    baseSrc: "src/",                // source directory
    baseDist: "dist/",              // build directory
    baseDistAssets: "dist/assets/", // build assets directory
    baseSrcAssets: "src/assets/",   // source assets directory

    plugin: {
        styles: [
            "./node_modules/dropzone/dist/min/dropzone.min.css",
            "./node_modules/flatpickr/dist/flatpickr.css",
            "./node_modules/quill/dist/quill.core.css",
            "./node_modules/quill/dist/quill.bubble.css",
            "./node_modules/quill/dist/quill.snow.css",
        ],

        scripts: [
            "./node_modules/bootstrap/dist/js/bootstrap.bundle.js",
            "./node_modules/simplebar/dist/simplebar.min.js",
            "./node_modules/apexcharts/dist/apexcharts.min.js",
            "./node_modules/dropzone/dist/min/dropzone.min.js",
            "./node_modules/flatpickr/dist/flatpickr.js",
            "./node_modules/quill/dist/quill.min.js",
            "./node_modules/iconify-icon/dist/iconify-icon.min.js",
        ]
    },

};

const plugins = function () {

    const outcss = paths.baseDistAssets + "css/";

    src(paths.plugin.styles)
        .pipe(concat("vendor.min.css"))
        .pipe(CleanCSS())
        .pipe(dest(outcss));

    const outjs = paths.baseDistAssets + "js/";

    src(paths.plugin.scripts)
        .pipe(concat("vendor.js"))
        .pipe(uglify())
        .pipe(rename({ suffix: ".min" }))
        .pipe(dest(outjs));

    const out = paths.baseDistAssets + "vendor/";
    return src(npmdist(), { base: "./node_modules" })
        .pipe(rename(function (path) {
            path.dirname = path.dirname.replace(/\/dist/, '').replace(/\\dist/, '');
        }))
        .pipe(dest(out));
};


const clean = function (done) {
    del.sync(paths.baseDist, done());
};

const html = function () {
    const srcPath = paths.baseSrc + "/";
    const out = paths.baseDist;
    return src([
        srcPath + "*.html",
        srcPath + "*.ico", // favicon
        srcPath + "*.png",
    ])
        .pipe(
            fileinclude({
                prefix: "@@",
                basepath: "@file",
                indent: true,
            })
        )
        .pipe(dest(out));
};

const data = function () {
    const out = paths.baseDistAssets + "data/";
    return src([paths.baseSrcAssets + "data/**/*"])
        .pipe(dest(out));
};

const fonts = function () {
    const out = paths.baseDistAssets + "fonts/";
    return src([paths.baseSrcAssets + "fonts/**/*"])
        .pipe(newer(out))
        .pipe(dest(out));
};

const images = function () {
    var out = paths.baseDistAssets + "images";
    return src(paths.baseSrcAssets + "images/**/*")
        .pipe(newer(out))
        .pipe(dest(out));
};


const javascript = function () {
    const out = paths.baseDistAssets + "js/";

    return src(paths.baseSrcAssets + "js/**/*")
        .pipe(uglify())
        .pipe(dest(out));

};

const scss = function () {
    const out = paths.baseDistAssets + "css/";

    src(paths.baseSrcAssets + "scss/style.scss")
        .pipe(sourcemaps.init())
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(
            autoprefixer({
                overrideBrowserslist: ["last 2 versions"],
            })
        )
        .pipe(dest(out))
        .pipe(CleanCSS())
        .pipe(rename({ suffix: ".min" }))
        .pipe(sourcemaps.write("./"))
        .pipe(dest(out));

    // generate rtl
    return src(paths.baseSrcAssets + "scss/style.scss")
        .pipe(sourcemaps.init())
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(
            autoprefixer({
                overrideBrowserslist: ["last 2 versions"],
            })
        )
        .pipe(rtlcss())
        .pipe(rename({ suffix: "-rtl" }))
        .pipe(dest(out))
        .pipe(CleanCSS())
        .pipe(rename({ suffix: ".min" }))
        .pipe(sourcemaps.write("./"))
        .pipe(dest(out));
};

const icons = function () {
    const out = paths.baseDistAssets + "css/";
    return src(paths.baseSrcAssets + "scss/icons.scss")
        .pipe(sourcemaps.init())
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(
            autoprefixer({
                overrideBrowserslist: ["last 2 versions"],
            })
        )
        .pipe(dest(out))
        .pipe(CleanCSS())
        .pipe(rename({ suffix: ".min" }))
        .pipe(sourcemaps.write("./"))
        .pipe(dest(out));
};


// Live Browser loading
const initBrowserSync = function (done) {
    const startPath = "/index.html";
    browsersync.init({
        startPath: startPath,
        server: {
            baseDir: paths.baseDist,
            middleware: [
                function (req, res, next) {
                    req.method = "GET";
                    next();
                },
            ],
        },
    });
    done();
}

const reloadBrowserSync = function (done) {
    browsersync.reload();
    done();
}

// File Watch Task
function watchFiles() {
    watch(paths.baseSrc + "**/*.html", series(html, reloadBrowserSync));
    watch(paths.baseSrcAssets + "data/**/*", series(data, reloadBrowserSync));
    watch(paths.baseSrcAssets + "fonts/**/*", series(fonts, reloadBrowserSync));
    watch(paths.baseSrcAssets + "images/**/*", series(images, reloadBrowserSync));
    watch(paths.baseSrcAssets + "js/**/*", series(javascript, reloadBrowserSync));
    watch([paths.baseSrcAssets + "scss/icons/*.scss", paths.baseSrcAssets + "scss/icons.scss"], series(icons, reloadBrowserSync));
    watch([paths.baseSrcAssets + "scss/**/*.scss", "!" + paths.baseSrcAssets + "scss/icons.scss"], series(scss, reloadBrowserSync));
}

// Production Tasks
exports.default = series(
    clean,
    html,
    parallel(plugins, fonts, images, javascript, scss, icons),
    parallel(watchFiles, initBrowserSync)
);

// Build Tasks
exports.build = series(
    clean,
    html,
    plugins,
    parallel(fonts, images, javascript, scss, icons)
);