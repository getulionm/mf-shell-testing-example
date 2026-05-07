export function makeContainer() {
  const el = global.document.createElement("div");
  global.document.body.appendChild(el);
  return el;
}

export function textContentBySelector(selector: string) {
  const el = global.document.querySelector(selector);
  return el ? el.textContent : "";
}
