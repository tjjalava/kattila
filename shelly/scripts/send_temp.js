let token = "secret_token"
let url = "https://temperature2"

function sendTemp() {
  let compYla = Shelly.getComponentStatus("temperature:100")
  let compAla = Shelly.getComponentStatus("temperature:101")
  let body = []

  if (compYla === null && compAla === null) {
    print("No temperature sensors found")
    return
  }

  if (compYla != null) {
    body.push({"peripheral": compYla.id, "temperature": compYla.tC})
  }

  if (compAla != null) {
    body.push({"peripheral": compAla.id, "temperature": compAla.tC})
  }

  Shelly.call(
    "HTTP.Request", {
      url: url,
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(body)
    }, function(result, error, errorMessage) {
      if (error) {
        print("Error: ", errorMessage)
      } else {
        print("Temperatures sent")
      }
    }
  )
}

Timer.set(60000, true, sendTemp)
