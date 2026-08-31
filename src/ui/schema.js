import { SOCIAL_SERVICES } from '../qr/payloads.js';

const socialFields = SOCIAL_SERVICES.map((service) => ({
  key: service.id,
  label: service.label,
  type: 'text',
  placeholder: '@handle or full link',
  autocomplete: 'off',
  width: 'half',
}));

export const CONTENT_TYPES = [
  {
    id: 'url',
    label: 'Link',
    lead: 'One address. Shortest payload, chunkiest blocks.',
    groups: [{
      fields: [{
        key: 'url',
        label: 'Web address',
        type: 'url',
        inputmode: 'url',
        autocomplete: 'url',
        placeholder: 'example.com/palash',
        hint: 'The https:// is added for you.',
        width: 'full',
      }],
    }],
  },
  {
    id: 'vcard',
    label: 'Contact',
    lead: 'Saved straight to a phone, no internet needed. Every field you fill adds blocks.',
    groups: [
      {
        legend: 'Name',
        fields: [
          { key: 'first', label: 'First name', type: 'text', autocomplete: 'given-name', placeholder: 'Palash', width: 'half' },
          { key: 'last', label: 'Last name', type: 'text', autocomplete: 'family-name', placeholder: 'Doe', width: 'half' },
        ],
      },
      {
        legend: 'Work',
        fields: [
          { key: 'org', label: 'Organisation', type: 'text', autocomplete: 'organization', placeholder: 'Liberty Mutual', width: 'full' },
          { key: 'title', label: 'Role', type: 'text', autocomplete: 'organization-title', placeholder: 'UX designer', width: 'full' },
        ],
      },
      {
        legend: 'Reach',
        fields: [
          { key: 'phone', label: 'Phone', type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '+49 170 1234567', width: 'full' },
          { key: 'email', label: 'Email', type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'you@example.com', width: 'full' },
          { key: 'url', label: 'Website', type: 'url', inputmode: 'url', autocomplete: 'url', placeholder: 'example.com', width: 'full' },
        ],
      },
      {
        legend: 'Address',
        collapsed: true,
        fields: [
          { key: 'street', label: 'Street', type: 'text', autocomplete: 'street-address', placeholder: 'Hauptwache 1', width: 'full' },
          { key: 'city', label: 'City', type: 'text', autocomplete: 'address-level2', placeholder: 'Frankfurt', width: 'half' },
          { key: 'postal', label: 'Postcode', type: 'text', inputmode: 'numeric', autocomplete: 'postal-code', placeholder: '60313', width: 'half' },
          { key: 'region', label: 'Region', type: 'text', autocomplete: 'address-level1', placeholder: 'Hesse', width: 'half' },
          { key: 'country', label: 'Country', type: 'text', autocomplete: 'country-name', placeholder: 'Germany', width: 'half' },
        ],
      },
      {
        legend: 'Social',
        collapsed: true,
        fields: socialFields,
      },
      {
        legend: 'Note',
        collapsed: true,
        fields: [{ key: 'note', label: 'Note', type: 'textarea', placeholder: 'Anything else worth carrying', width: 'full' }],
      },
    ],
  },
  {
    id: 'wifi',
    label: 'Wi-Fi',
    lead: 'Guests join by scanning. Nothing is typed and nothing is stored.',
    groups: [{
      fields: [
        {
          key: 'ssid',
          label: 'Network name',
          type: 'text',
          autocomplete: 'off',
          spellcheck: false,
          placeholder: 'Kitchen hotspot',
          hint: 'Case sensitive, exactly as the router broadcasts it.',
          width: 'full',
        },
        {
          key: 'security',
          label: 'Encryption',
          type: 'select',
          width: 'full',
          options: [
            ['WPA', 'WPA or WPA2'],
            ['SAE', 'WPA3'],
            ['WEP', 'WEP'],
            ['nopass', 'Open, no password'],
          ],
          hint: 'WPA covers almost every home router. WPA3 is newer and not every phone reads it.',
        },
        {
          key: 'password',
          label: 'Password',
          type: 'password',
          autocomplete: 'off',
          spellcheck: false,
          placeholder: 'The network password',
          width: 'full',
          when: (fields) => (fields.security || 'WPA') !== 'nopass',
        },
        {
          key: 'hidden',
          label: 'Network does not broadcast its name',
          type: 'checkbox',
          width: 'full',
        },
      ],
    }],
  },
  {
    id: 'text',
    label: 'Text',
    lead: 'Plain words. Whatever the scanner shows, it shows.',
    groups: [{
      fields: [{ key: 'text', label: 'Text', type: 'textarea', rows: 5, placeholder: 'Anything you like', width: 'full' }],
    }],
  },
  {
    id: 'email',
    label: 'Email',
    lead: 'Opens a mail app with the message already started.',
    groups: [{
      fields: [
        { key: 'to', label: 'To', type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'you@example.com', width: 'full' },
        { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Saying hello', width: 'full' },
        { key: 'body', label: 'Message', type: 'textarea', rows: 4, placeholder: 'Optional', width: 'full' },
      ],
    }],
  },
  {
    id: 'phone',
    label: 'Phone',
    lead: 'A call or a text, ready to send.',
    groups: [{
      fields: [
        {
          key: 'mode',
          label: 'Scanning it should',
          type: 'select',
          width: 'full',
          options: [['call', 'Start a call'], ['text', 'Start a text message']],
        },
        { key: 'number', label: 'Number', type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '+49 170 1234567', width: 'full' },
        {
          key: 'message',
          label: 'Message',
          type: 'textarea',
          rows: 3,
          placeholder: 'Optional',
          width: 'full',
          when: (fields) => fields.mode === 'text',
        },
      ],
    }],
  },
  {
    id: 'geo',
    label: 'Place',
    lead: 'Drops a pin in whichever map app the phone prefers.',
    groups: [{
      fields: [
        { key: 'lat', label: 'Latitude', type: 'text', inputmode: 'decimal', placeholder: '50.1109', width: 'half' },
        { key: 'lon', label: 'Longitude', type: 'text', inputmode: 'decimal', placeholder: '8.6821', width: 'half' },
      ],
    }],
  },
];

export function typeFor(id) {
  return CONTENT_TYPES.find((type) => type.id === id) || CONTENT_TYPES[0];
}

export function visibleFields(type, fields) {
  const out = [];
  for (const group of type.groups) {
    for (const field of group.fields) {
      if (field.when && !field.when(fields)) continue;
      out.push(field);
    }
  }
  return out;
}
