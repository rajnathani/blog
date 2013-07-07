import os
from iftrue import nerve_js
import shutil
import time

SKIN_STATIC_PATH = "/Users/relfor/earth/blog/skin/static"
NERVE_STATIC_PATH = "/Users/relfor/earth/blog/nerve/static"

# Folder names will and should be the same for
# the prototype (skin) and the working app (nerve)
CSS_FOLDER_NAME = "css"
JS_FOLDER_NAME = "js"
IMGS_FOLDER_NAME = "imgs"

CSS_BUNDLE_NAME = "bundle.css"
JS_LIB_BUNDLE_NAME = "lib.js"
JS_SRC_BUNDLE_NAME = "src.js"

# js frameworks and libraries, given in order
# these js files will be put in a separate bundled
# js files as they have to be available before the
# remaining, and thus by putting them in one file
# and including them in the html file before the
# remaining js files, it can be guaranteed that
# these files will be loaded before.
JS_LIB_FILES = ['oneminute.js', 'cook.js', 'popscript.js',
                'chosen.jquery.min.js', 'marked.js', 'jquery.autosize-min.js', 'prettify.js',
                'core.js']

# files to be excluded in the bundle as it this will
# be loaded separately through a CDN
# NOTE: Any of the following js files to be
# ignored will not be ignored if they
# are present in the JS_LIB_FILES list.
JS_IGNORE = ['jquery.js']

# all css files, which will be added in order
CSS_FILES = ['fonts.css', 'chosen.css', 'animations.css', 'popscript.css', 'core.css', 'search.css', 'prettify.css', 'responsive.css']

REQ_STATIC_SUB_FOLDERS = [CSS_FOLDER_NAME, JS_FOLDER_NAME, IMGS_FOLDER_NAME]
for req in REQ_STATIC_SUB_FOLDERS:
    req_full_path = NERVE_STATIC_PATH + '/' + req
    if not os.path.isdir(req_full_path):
        print 'FOLDER NOT PRESENT: %s' % req_full_path
        os.makedirs(req_full_path)
        print 'CREATED FOLDER: %s\n' % req_full_path


def skintonerve():
    imgs()
    css()
    js()

def visible_file_of_extension(full_file_path, ext=None):
    return (os.path.isfile(full_file_path)) and not full_file_path[full_file_path.rfind('/') + 1:].startswith('.') and \
           (ext is None) or (os.path.splitext(full_file_path)[1] == (".%s" % ext))


def css():
    print '\n*** CSS ***\n'
    raw_skin_folder = os.listdir(SKIN_STATIC_PATH + '/' + CSS_FOLDER_NAME)
    full_path_skin_folder = [SKIN_STATIC_PATH + '/' + CSS_FOLDER_NAME + '/' + item for item in raw_skin_folder]
    # create a dictionary mapping half given paths to full given paths
    file_dict = dict(zip(raw_skin_folder, full_path_skin_folder))

    css_bundle = ""
    for file_name in CSS_FILES:
        full_file_path = file_dict[file_name]
        if visible_file_of_extension(full_file_path, 'css'):
            f = open(full_file_path)
            css_bundle += f.read()
            f.close()
            print 'CSS FILE ADDED TO BUNDLE: %s' % file_name

    for file_name, full_file_path in file_dict.iteritems():
        if visible_file_of_extension(full_file_path, 'css') and \
           file_name not in CSS_FILES:
            if raw_input('CSS FILE NOT PRESENT IN MANIFEST: %s\nADD THIS TO BUNDLE? (y/n)' % file_name) != "n":
                f = open(full_file_path)
                css_bundle += f.read()
                f.close()
                print 'CSS FILE ADDED TO BUNDLE: %s' % file_name
            else:
                print 'CSS FILE IGNORED: %s' % file_name

    target_folder = NERVE_STATIC_PATH + '/' + CSS_FOLDER_NAME
    bundle_full_path = target_folder + '/' + CSS_BUNDLE_NAME
    f = open(bundle_full_path, 'w')
    f.write(css_bundle)
    f.close()
    print '\nCSS BUNDLE CREATED AT: %s' % bundle_full_path

    print '\n*** END OF CSS ***\n'


def js():
    print '\n*** JS ***\n'
    raw_skin_folder = os.listdir(SKIN_STATIC_PATH + '/' + JS_FOLDER_NAME)
    full_path_skin_folder = [SKIN_STATIC_PATH + '/' + JS_FOLDER_NAME + '/' + item for item in raw_skin_folder]
    # create a dictionary mapping half given paths to full given paths
    file_dict = dict(zip(raw_skin_folder, full_path_skin_folder))

    target_folder = NERVE_STATIC_PATH + '/' + JS_FOLDER_NAME

    js_lib = ""
    js_src = ""

    for file_name in JS_LIB_FILES:
        full_file_path = file_dict[file_name]
        if visible_file_of_extension(full_file_path, 'js'):
            f = open(full_file_path)
            js_lib += nerve_js(f.read()) + ";"
            f.close()
            print 'JS FILE ADDED TO FRAMEWORKS & LIBRARIES BUNDLE: %s' % file_name

    js_lib_bundle_full_path = target_folder + '/' + JS_LIB_BUNDLE_NAME
    f = open(js_lib_bundle_full_path, 'w')
    f.write(js_lib)
    f.close()

    print '\nMINIFYING JS FRAMEWORKS & LIBRARIES BUNDLE\n'
    minified_contents = os.popen('uglifyjs %s -c -m' % js_lib_bundle_full_path).read()
    f = open(js_lib_bundle_full_path, 'w')
    f.write(minified_contents)
    f.close()

    print '\nJS FRAMEWORKS & LIBRARIES BUNDLE CREATED AT: %s\n' % js_lib_bundle_full_path

    for file_name, full_file_path in file_dict.iteritems():
        if visible_file_of_extension(full_file_path, 'js') and file_name not in (JS_LIB_FILES + JS_IGNORE):
            f = open(full_file_path)
            js_src += nerve_js(f.read()) + ";"
            f.close()
            print 'JS FILE ADDED TO SOURCE BUNDLE: %s' % file_name

    print '\nMINIFYING JS SOURCE BUNDLE\n'
    js_src_bundle_full_path = target_folder + '/' + JS_SRC_BUNDLE_NAME
    f = open(js_src_bundle_full_path, 'w')
    f.write(js_src)
    f.close()

    minified_contents = os.popen('uglifyjs %s -c -m' % js_src_bundle_full_path).read()
    f = open(js_src_bundle_full_path, 'w')
    f.write(minified_contents)
    f.close()

    print '\nJS SOURCE BUNDLE CREATED AT: %s\n' % js_src_bundle_full_path

    print '\n*** END OF JS ***\n'


def imgs():
    print '\n*** IMAGES ***\n'
    raw_skin_folder = os.listdir(SKIN_STATIC_PATH + '/' + IMGS_FOLDER_NAME)
    full_path_skin_folder = [SKIN_STATIC_PATH + '/' + IMGS_FOLDER_NAME + '/' + item for item in raw_skin_folder]
    # create a dictionary mapping half given paths to full given paths
    file_dict = dict(zip(raw_skin_folder, full_path_skin_folder))

    target_folder = NERVE_STATIC_PATH + '/' + IMGS_FOLDER_NAME
    for (file_name, full_file_path) in file_dict.iteritems():
        if visible_file_of_extension(full_file_path):
            shutil.copy2(full_file_path, target_folder + "/" + file_name)
            print 'IMAGE TRANSFERRED: %s' % file_name

    print '\n*** END OF IMAGES ***\n'

ignore = """
def copy_folder(folder_name):
    raw_skin_folder = os.listdir(SKIN_STATIC_PATH + '/' + folder_name)
    full_path_skin_folder = [SKIN_STATIC_PATH + '/' + folder_name + '/' + item for item in raw_skin_folder]
    # create a dictionary mapping half given paths to full given paths
    file_dict = dict(zip(raw_skin_folder, full_path_skin_folder))
    js_framework_bundle = ""
    for (file_name, full_file_path) in file_dict.iteritems():
        if (os.path.isfile(full_file_path)) and not file_name.startswith('.'):

            target_folder = NERVE_STATIC_PATH + '/' + folder_name
            if not os.path.isdir(target_folder):
                os.mkdir(target_folder)

            target_file_name = target_folder + '/' + file_name
            fName, fExtension = os.path.splitext(target_file_name)
            if folder_name in ('css', 'js') and fExtension != '.zip':
                f = open(full_file_path)
                contents = f.read()
                if folder_name == 'js':
                    contents = nerve_js(contents)
                f.close()
                f = open(target_file_name, 'w')
                f.write(contents)
                f.close()
                # minify
                if folder_name == 'js':
                    #uglify.js
                    minified_contents = os.popen('uglifyjs %s -c -m' % target_file_name).read()
                    f = open(target_file_name, 'w')
                    f.write(minified_contents)
                    f.close()
            else:
                # For Images
                shutil.copy2(full_file_path, target_file_name)
"""


if __name__ == "__main__":
    start_time = time.time()
    skintonerve()
    print '\nCOMPLETED IN %.2f SECONDS\n\n\n\n' % (time.time() - start_time)
