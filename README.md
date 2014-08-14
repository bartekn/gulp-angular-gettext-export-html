# gulp-angular-gettext-export-html

## About

Gulp plugin for parsing angular templates with [angular-gettext](http://angular-gettext.rocketeer.be/)
attributes (`translate`) and replacing contents with translated `.po` files
passed as an argument. It allows to translate templates as much as possible
during build process and reduce the amount of work each browser does during
templates rendering.

Then you can use `gulp.dest` to save files in selected directory.

Initial state:

```
templates/
├── reward-container.html
└── verify-email.html
```

After running plugin

```
templates/
├── translated
│   └── pl
│       ├── reward-container.html
│       └── verify-email.html
├── reward-container.html
└── verify-email.html
```

## Usage

```js
var gulp = require('gulp');
var gettext_export_html = require('gulp-angular-gettext-export-html');

gulp.task('gettext-compile-html', function () {
    return gulp.src('app/templates/*.html')
                   .pipe(gettext_export_html('po/*.po'))
                   .pipe(gulp.dest('app/templates/translated'))
});
```