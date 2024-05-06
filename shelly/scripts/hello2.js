Shelly.call(
  "HTTP.POST", {
    "url": "https://httpbin.org/post",
    "body": "world!"
  },
  function(result) {
    let response = JSON.parse(result.body);
    print("Hello ", response.data);
  }
);
