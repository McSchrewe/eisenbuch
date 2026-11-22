import Toybox.Application;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.WatchUi;

// Einstieg der Uhr-App: Modell anlegen, Nachrichten vom Handy empfangen, Hauptansicht zeigen
class EisenbuchApp extends Application.AppBase {
    var model;

    function initialize() {
        AppBase.initialize();
        model = new Model();
    }

    function onStart(state) {
        Communications.registerForPhoneAppMessages(method(:onPhone));
        model.start();
    }

    function onStop(state) {
        model.stop();
    }

    function onPhone(msg as Communications.PhoneAppMessage) as Void {
        model.onPhone(msg.data);
    }

    function getInitialView() {
        return [new MainView(model), new MainDelegate(model)];
    }
}
