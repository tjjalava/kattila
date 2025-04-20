let ComponentDownTemp = 204;   // Komponentti: Minimi alalämpötila
let ComponentUpTemp = 205;   // Komponentti: Minimi ylälämpötila
let RelayUp = 0;
let RelayDown = 1;

function printDebug(message) {
  print("Heating: " + message);
}

let token = "SECRET_TOKEN"
let reportUrl = "https://gaqwlaafsprpmoezomkj.supabase.co/functions/v1/resistor-state";
let settingsUrl = "https://gaqwlaafsprpmoezomkj.supabase.co/functions/v1/calculate-settings";

let statusUp = -1;
let statusDown = -1;
let currentHandlerTs = ""
function statusHandler(statusEvent) {
  let name = statusEvent.name;
  let id = statusEvent.id;
  if (name === "switch" && id < 2) {
    let timestamp = new Date().toISOString();
    currentHandlerTs = timestamp;
    Timer.set(2000, false, function () {
      if (currentHandlerTs !== timestamp) {
        let body = {
          timestamp: timestamp,
          up: Shelly.getComponentStatus("switch:" + RelayUp).output,
          down: Shelly.getComponentStatus("switch:" + RelayDown).output,
        };
        if (body.up !== statusUp || body.down !== statusDown) {
          statusUp = body.up;
          statusDown = body.down;
          printDebug("Switch status: " + JSON.stringify(body));
          Shelly.call(
            "HTTP.Request",
            {
              url: reportUrl,
              method: "POST",
              headers: {
                "Authorization": "Bearer " + token
              },
              body: JSON.stringify(body)
            },
            function (result, error, errorMessage) {
              if (error) {
                printDebug("Error: ", errorMessage)
              }
            }
          );
        } else {
          printDebug("Status handler: event ignored, no changes.");
        }
      } else {
        printDebug("Status handler: event ignored, timestamp mismatch.");
      }
    })
  }
}

Shelly.addStatusHandler(statusHandler);

let hour = -1;
let prevSetting = 0;

printDebug("Ohjaus käynnistyy 30 sekunnissa.");

Timer.set(30000, true, function () {
  let currentHour = new Date().getHours();

  if (hour === currentHour) {
    printDebug("Odotetaan tunnin vaihtumista.");
    return;
  }

  let upMinTemp = Shelly.getComponentStatus("number", ComponentUpTemp)["value"];
  let downMinTemp = Shelly.getComponentStatus("number", ComponentDownTemp)["value"];


  printDebug("Lämpötilarajat: ylä: " + upMinTemp + ", ala: " + downMinTemp);
  let url = settingsUrl + "?up=" + upMinTemp + "&down=" + downMinTemp;
  Shelly.call(
    "HTTP.Request",
    {
      url: url,
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token
      }
    },
    function (res, err) {
      let on = 0
      let error = err !== 0 || res == null || res.code !== 200;
      if (error) {
        printDebug(res.code);
        printDebug(err);
      }

      if (!error) {
        if (res.body !== undefined) {
          try {
            let body = JSON.parse(res.body);
            if (body !== null) {
              on = body.currentPower;
              hour = currentHour;
            } else {
              error = true;
            }
          } catch (e) {
            error = true;
          }
        } else {
          error = true;
        }
      }

      if (error) {
        let varatunnit = [2, 3, 4, 5];
        if (varatunnit.indexOf(currentHour) > -1) {
          on = 12;
          hour = currentHour;
          printDebug("Virhetilanne. Kuluva tunti on varatunti: rele kytketään päälle tämän tunnin ajaksi.");
        } else {
          printDebug("Virhetilanne. Kuluva tunti ei ole varatunti: relettä ei kytketä. Yhteyttä yritetään uudestaan.");
        }
      }

      if (prevSetting === on) {
        printDebug("Ei muutoksia releiden tiloihin.");
      } else {
        if (on === 0) {
          Shelly.call("Switch.Set", {id: RelayDown, on: false}, null, null);
          Shelly.call("Switch.Set", {id: RelayUp, on: false}, null, null);
          printDebug("Kytketään releet pois päältä.");
        } else if (on === 6) {
          Shelly.call("Switch.Set", {id: RelayDown, on: false}, null, null);
          Shelly.call("Switch.Set", {id: RelayUp, on: true}, null, null);
          printDebug("Kytketään ylärele päälle, alarele pois päältä.");
        } else {
          Shelly.call("Switch.Set", {id: RelayUp, on: false}, null, null);
          Shelly.call("Switch.Set", {id: RelayDown, on: true}, null, null);
          printDebug("Kytketään alarele päälle, ylärele pois päältä.");
        }
        prevSetting = on;
      }
    });
});
