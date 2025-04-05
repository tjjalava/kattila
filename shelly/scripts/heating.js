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

function statusHandler(statusEvent) {
  let name = statusEvent.name;
  let id = statusEvent.id;
  if (name === "switch" && id < 2) {
    let delta = statusEvent.delta;
    if (delta.output !== undefined) {
      let currentSwitch = "switch:" + id;
      let otherSwitch = "switch:" + ((id + 1) % 2);
      printDebug("Current: " + currentSwitch + ", other: " + otherSwitch)
      let body = {};
      body[currentSwitch] = delta.output;
      body[otherSwitch] = Shelly.getComponentStatus(otherSwitch).output;
      printDebug("Switch status: " + JSON.stringify(body));
      Shelly.call(
        "HTTP.Request",
        {
          url: reportUrl,
          method: "POST",
          headers: {
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify({down: body["switch:1"], up: body["switch:0"]})
        },
        function (result, error, errorMessage) {
          if (error) {
            printDebug("Error: ", errorMessage)
          }
        }
      );
    }
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
  let url = settingsUrl + "?up=" + upMinTemp + "?down=" + downMinTemp;
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
          Shelly.call("Switch.Set", {id: RelayDown, on: true}, null, null);
          Shelly.call("Switch.Set", {id: RelayUp, on: false}, null, null);
          printDebug("Kytketään alarele päälle, ylärele pois päältä.");
        }
        prevSetting = on;
      }
    });
});
