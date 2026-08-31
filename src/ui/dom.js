let counter = 0;

export function nextId(prefix = 'f') {
  counter += 1;
  return `${prefix}${counter}`;
}

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
