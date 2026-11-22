import Toybox.Application;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.WatchUi;

// Einstieg der Uhr-App. Das Modell entsteht erst mit der Hauptansicht, damit der Glance (Widget-Zeile) klein bleibt.
(:glance)
class EisenbuchApp extends Application.AppBase {
    var model = null;

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state) {
    }

    function onStop(state) {
        if (model != null) {
            model.stop();
        }
    }

    function onPhone(msg as Communications.PhoneAppMessage) as Void {
        if (model != null) {
            model.onPhone(msg.data);
        }
    }

    function getInitialView() {
        model = new Model();
        Communications.registerForPhoneAppMessages(method(:onPhone));
        model.start();
        return [new MainView(model), new MainDelegate(model)];
    }

    function getGlanceView() {
        return [new EbGlance()];
    }
}
