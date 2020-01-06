const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Lang = imports.lang;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const SCHEMA = 'org.gnome.shell.extensions.floatingPanel';
const HOTKEY = 'floating-panel-hotkey';
const DIRECTION = 'floating-panel-direction';
const ICON_SIZE = 'floating-panel-icon-size';
const ICON_FILE = 'floating-panel-icon-file';

const DIRECTION_LIST = {
    "up": "up",
    "down": "down",
    "right": "right",
    "left": "left",
};

const ICON_SIZE_LIST = {
    128 : '128',
    96  : '96',
    64  : '64',
    48  : '48',
    32  : '32',
    24  : '24',
    16  : '16',
};

function init() {
    //Convenience.initTranslations();
}

function buildPrefsWidget() {
    let frame = new Frame();
    frame.widget.show_all();

    return frame.widget;
}

var Frame = class Frame {
    constructor() {
        this._settings = Convenience.getSettings(SCHEMA);

        this._builder = new Gtk.Builder();
        this._builder.add_from_file(Me.path + '/prefs.ui');

        this.widget = this._builder.get_object('settings_notebook');

        let settings_box = this._builder.get_object('settings_box');

        //settings_box.add(this.addItemSwitch("<b>Icon list direction</b>", DIRECTION));
        settings_box.add(this.addDirectionCombo());
        settings_box.add(this.addIconSizeCombo());

        settings_box.add(this.addIconFile());
    }

    addDirectionCombo() {
        let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL,
                                 margin_top: 10,
                                 margin_left: 20,
                                 margin_right: 20,
        });
        let setting_label = new Gtk.Label({  xalign: 0 });
        setting_label.set_markup("<b>Icon List Direction</b>");
        hbox.pack_start(setting_label, true, true, 0);
        hbox.add(this.directionCombo());

        return hbox;
    }

    directionCombo() {
        let combo = new Gtk.ComboBoxText();
        combo.set_entry_text_column(0);

        for (let l in DIRECTION_LIST) {
            combo.append(l, DIRECTION_LIST[l]);
        }
        combo.set_active_id(this._settings.get_string(DIRECTION));

        combo.connect('changed', () => {
            this._settings.set_string(DIRECTION, combo.get_active_id());
        });

        return combo;
    }

    addIconSizeCombo() {
        let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL,
                                 margin_top: 10,
                                 margin_left: 20,
                                 margin_right: 20,
        });
        let setting_label = new Gtk.Label({  xalign: 0 });
        setting_label.set_markup("<b>Icon Size</b>");
        hbox.pack_start(setting_label, true, true, 0);
        hbox.add(this.iconSizeCombo());

        return hbox;
    }

    iconSizeCombo() {
        let combo = new Gtk.ComboBoxText();
        combo.set_entry_text_column(0);

        for (let l in ICON_SIZE_LIST) {
            combo.append(l, ICON_SIZE_LIST[l]);
        }
        combo.set_active_id(this._settings.get_int(ICON_SIZE).toString());

        combo.connect('changed', () => {
            this._settings.set_int(ICON_SIZE, combo.get_active_id());
        });

        return combo;
    }

    addIconFile() {
        let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL,
                                 margin_top: 10,
                                 margin_left: 20,
                                 margin_right: 20,
        });

        let setting_label = new Gtk.Label({  xalign: 0 });
        setting_label.set_markup("<b>Icon File</b>");
        this.setting_entry = new Gtk.Entry({ hexpand: true, margin_left: 20 });

        this.setting_entry.set_text(this._settings.get_string(ICON_FILE));
        this.setting_entry.connect('changed', (entry) => { this._settings.set_string(ICON_FILE, entry.get_text()); });

        this.fileChooseButton = new Gtk.Button({ margin_left: 5 });
        this.fileChooseButton.set_label("Browse");
        this.fileChooseButton.connect("clicked", this.showFileChooserDialog.bind(this));


        hbox.pack_start(setting_label, false, true, 0);
        hbox.add(this.setting_entry);
        hbox.add(this.fileChooseButton);

        return hbox;
    }

    showFileChooserDialog() {
        let fileChooser = new Gtk.FileChooserDialog({ title: "Select File" });
        fileChooser.set_transient_for(this.widget.get_parent());
        fileChooser.set_default_response(1);

        let filter = new Gtk.FileFilter();
        filter.add_pixbuf_formats();
        fileChooser.filter = filter;

        fileChooser.add_button("Cancel", Gtk.ResponseType.CANCEL);
        fileChooser.add_button("Open", Gtk.ResponseType.ACCEPT);

        let preview_image = new Gtk.Image();
        fileChooser.set_preview_widget(preview_image);

        fileChooser.connect('update-preview', (dialog) => {
        dialog.set_preview_widget_active(false);
            let file = fileChooser.get_uris();
            if (file.length > 0 && file[0].startsWith("file://")) {
                file = decodeURIComponent(file[0].substring(7));
            } else {
                return;
            }
            if (GLib.file_test(file, GLib.FileTest.IS_DIR))
                return;
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file(file);
            let maxwidth = 400.0, maxheight = 800.0;
            let width = pixbuf.get_width(), height = pixbuf.get_height();
            let scale = Math.min(maxwidth / width, maxheight / height);
            if (scale < 1) {
                width = width * scale;
                height = height * scale;
                pixbuf = pixbuf.scale_simple(width.toFixed(0), height.toFixed(0), GdkPixbuf.InterpType.BILINEAR);
            }
            preview_image.set_from_pixbuf(pixbuf);
            dialog.set_preview_widget_active(true);
        });

        switch(fileChooser.run()) {
            case Gtk.ResponseType.CANCEL:
                fileChooser.destroy();
                break;
            case Gtk.ResponseType.ACCEPT:
                let file = fileChooser.get_uris();
                if (file.length > 0 && file[0].startsWith("file://"))
                    this.setting_entry.set_text(decodeURIComponent(file[0].substring(7)));
                fileChooser.destroy();
                break;
            default:
        }
    }

    addItemSwitch(string, key) {
        let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, margin_top: 20});
        let info = new Gtk.Label({xalign: 0});
        info.set_markup(string);
        hbox.pack_start(info, false, false, 0);

        let button = new Gtk.Switch({ active: gsettings.get_boolean(key) });
        button.connect('notify::active', (button) => { gsettings.set_boolean(key, button.active); });
        hbox.pack_end(button, false, false, 0);
        return hbox;
    }
};