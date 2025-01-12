const typing_status = require("../shared/js/typing_status");

var typing = (function () {
var exports = {};

// This module handles the outbound side of typing indicators.
// We detect changes in the compose box and notify the server
// when we are typing.  For the inbound side see typing_events.js.
//
// See docs/subsystems/typing-indicators.md for details on typing indicators.

function send_typing_notification_ajax(user_ids_array, operation) {
    channel.post({
        url: '/json/typing',
        data: {
            to: JSON.stringify(user_ids_array),
            op: operation,
        },
        success: function () {},
        error: function (xhr) {
            blueslip.warn("Failed to send typing event: " + xhr.responseText);
        },
    });
}

function get_user_ids_array() {
    var user_ids_string = compose_pm_pill.get_user_ids_string();
    if (user_ids_string === "") {
        return null;
    }

    return people.user_ids_string_to_ids_array(user_ids_string);
}

function is_valid_conversation() {
    var compose_empty = !compose_state.has_message_content();
    if (compose_empty) {
        return false;
    }

    return true;
}

function get_current_time() {
    return new Date().getTime();
}

function notify_server_start(user_ids_array) {
    send_typing_notification_ajax(user_ids_array, "start");
}

function notify_server_stop(user_ids_array) {
    send_typing_notification_ajax(user_ids_array, "stop");
}

exports.get_recipient = get_user_ids_array;
exports.initialize = function () {
    var worker = {
        get_current_time: get_current_time,
        notify_server_start: notify_server_start,
        notify_server_stop: notify_server_stop,
    };

    $(document).on('input', '#compose-textarea', function () {
        // If our previous state was no typing notification, send a
        // start-typing notice immediately.
        var new_recipient =
          is_valid_conversation() ? exports.get_recipient() : null;
        typing_status.update(worker, new_recipient);
    });

    // We send a stop-typing notification immediately when compose is
    // closed/cancelled
    $(document).on('compose_canceled.zulip compose_finished.zulip', function () {
        typing_status.update(worker, null);
    });
};

return exports;
}());

if (typeof module !== 'undefined') {
    module.exports = typing;
}
window.typing = typing;
