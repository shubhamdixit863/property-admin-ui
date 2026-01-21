const API_ORIGIN = "http://209.38.68.18:8000";

exports.handler = async (event) => {
  const prefix = "/.netlify/functions/api";
  const path = event.path.startsWith(prefix)
    ? event.path.slice(prefix.length)
    : event.path;
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const targetUrl = `${API_ORIGIN}${path}${query}`;

  const headers = { ...event.headers };
  delete headers.host;
  delete headers.connection;
  delete headers["accept-encoding"];
  delete headers["content-length"];

  const body =
    event.httpMethod === "GET" || event.httpMethod === "HEAD"
      ? undefined
      : event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : event.body;

  const response = await fetch(targetUrl, {
    method: event.httpMethod,
    headers,
    body,
  });

  const contentType = response.headers.get("content-type") || "";
  const isBinary = !contentType.includes("application/json") &&
    !contentType.startsWith("text/");
  const responseBody = isBinary
    ? Buffer.from(await response.arrayBuffer()).toString("base64")
    : await response.text();

  return {
    statusCode: response.status,
    headers: {
      "content-type": contentType,
    },
    body: responseBody,
    isBase64Encoded: isBinary,
  };
};
