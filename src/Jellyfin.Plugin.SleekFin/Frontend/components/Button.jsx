import { Icon, setIcon } from './Icon.jsx';
import { h } from 'preact';

const decorations = new WeakMap();

function classes(...values) {
  return values.filter(Boolean).join(' ');
}

export function Button({ variant, icon, label, class: classValue, ...props }) {
  return (
    <button type="button" class={classes('sleekfin-button', `sleekfin-button-${variant}`, variant === 'control' && 'sleekfin-control-3d', classValue)} {...props}>
      <Icon name={icon} />
      <span class="sleekfin-button-label">{label}</span>
    </button>
  );
}

export function IconButton({ icon, label, raised, strokeWidth, class: classValue, ...props }) {
  return (
    <button type="button" class={classes('sleekfin-icon-button', raised && 'sleekfin-control-3d', classValue)} title={label} {...props}>
      <Icon name={icon} strokeWidth={strokeWidth} />
    </button>
  );
}

function stripTextNodes(container, stashed) {
  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue && node.nodeValue.trim()) {
      stashed.push({ node, text: node.nodeValue });
      node.nodeValue = '';
    }
  });
}

function setNativeContent(parent, iconName, label, stashed) {
  stripTextNodes(parent, stashed);
  setIcon(parent, iconName);
  let labelElement = parent.querySelector(':scope > .sleekfin-button-label');
  if (!labelElement) {
    labelElement = document.createElement('span');
    labelElement.className = 'sleekfin-button-label';
    labelElement.textContent = label;
    parent.appendChild(labelElement);
  } else if (labelElement.textContent !== label) {
    labelElement.textContent = label;
  }
}

export function restoreNativeButton(element) {
  const record = decorations.get(element);
  if (!record) return;
  const { content, stashed } = record;

  element.classList.remove('sleekfin-button', 'sleekfin-button-primary', 'sleekfin-button-control', 'sleekfin-control-3d');
  content.classList.remove('sleekfin-button-content');
  content.querySelector(':scope > .sleekfin-icon')?.remove();
  content.querySelector(':scope > .sleekfin-button-label')?.remove();
  stashed.forEach((entry) => {
    entry.node.nodeValue = entry.text;
  });
  decorations.delete(element);
}

export function decorateNativeButton(element, options) {
  const settings = options || {};
  const content = settings.content || element;
  let record = decorations.get(element);
  if (record && record.content !== content) {
    restoreNativeButton(element);
    record = null;
  }
  if (!record) {
    record = { content, stashed: [] };
    decorations.set(element, record);
  }

  if (content !== element) {
    stripTextNodes(element, record.stashed);
  }
  element.classList.remove('sleekfin-button-primary', 'sleekfin-button-control');
  element.classList.add('sleekfin-button', `sleekfin-button-${settings.variant}`);
  element.classList.toggle('sleekfin-control-3d', settings.variant === 'control');
  content.classList.add('sleekfin-button-content');
  setNativeContent(content, settings.icon, settings.label, record.stashed);
}
