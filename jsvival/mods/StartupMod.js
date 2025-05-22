JSV.api.modname = "StartupMod";
JSV.api.modversion = "1.0.0";
JSV.api.moddescription = "A test mod to demonstrate the modding API.";
JSV.api.modauthor = "JSVival developer <3";

let show_message = true; // Flag to control message display

function startup() {
    // This function runs when the mod is loaded
    JSV.api.send_message("StartupMod has been loaded!");
    JSV.api.send_message("if you're running this mod on github,");
    JSV.api.send_message("you can't add mods, to add mods,");
    JSV.api.send_message("clone the repo https://github.com/Icarogamer2441/JSVival.git");
    JSV.api.send_message("which is the game code");
}

JSV.api.on_player_move = function() {
    if (show_message) {
        startup(); // Call the startup function
        show_message = false; // Prevent showing the message again
    }
};
