const SVGNamespace = 'http://www.w3.org/2000/svg';

type SVGShape = {
  TagName: string;
  Attributes: Record<string, string>;
};

type SVGDefinition = {
  Attributes: Record<string, string>;
  Shapes: Array<SVGShape>;
};

const EmbedIconDefinition: SVGDefinition = {
  Attributes: {
    xmlns: SVGNamespace,
    width: '16',
    height: '16',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  },
  Shapes: [
    { TagName: 'polyline', Attributes: { points: '16 18 22 12 16 6' } },
    { TagName: 'polyline', Attributes: { points: '8 6 2 12 8 18' } },
  ],
};

const OpenIconDefinition: SVGDefinition = {
  Attributes: {
    xmlns: SVGNamespace,
    width: '14',
    height: '14',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  },
  Shapes: [
    {
      TagName: 'path',
      Attributes: { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' },
    },
    { TagName: 'polyline', Attributes: { points: '15 3 21 3 21 9' } },
    { TagName: 'line', Attributes: { x1: '10', y1: '14', x2: '21', y2: '3' } },
  ],
};

/**
* Creates an SVG element and applies all provided attributes.
*
* @param {Document} DocumentRef Active document reference used for element creation.
* @param {string} TagName SVG tag name to create.
* @param {Record<string, string>} Attributes Attributes to apply to the created element.
* @returns {SVGElement} - Constructed SVG element.
*/
const CreateSVGElement = (DocumentRef: Document, TagName: string, Attributes: Record<string, string>): SVGElement => {
  const SVGElementRef = DocumentRef.createElementNS(SVGNamespace, TagName);
  for (const [AttributeName, AttributeValue] of Object.entries(Attributes)) {
    SVGElementRef.setAttribute(AttributeName, AttributeValue);
  }
  return SVGElementRef;
};

/**
* Builds a full SVG node tree from a shape definition.
*
* @param {Document} DocumentRef Active document reference used for element creation.
* @param {SVGDefinition} Definition SVG definition containing root attributes and child shapes.
* @returns {SVGSVGElement} - Root SVG element with all child shapes appended.
*/
const BuildSVGElement = (DocumentRef: Document, Definition: SVGDefinition): SVGSVGElement => {
  const RootElement = CreateSVGElement(DocumentRef, 'svg', Definition.Attributes);
  for (const Shape of Definition.Shapes) {
    RootElement.appendChild(CreateSVGElement(DocumentRef, Shape.TagName, Shape.Attributes));
  }
  return RootElement as SVGSVGElement;
};

/**
* Serialises an SVG definition into markup for string-based rendering.
*
* @param {SVGDefinition} Definition SVG definition containing root attributes and child shapes.
* @returns {string} - SVG markup string.
*/
const BuildSVGMarkup = (Definition: SVGDefinition): string => {
  const AttributeMarkup = Object.entries(Definition.Attributes)
    .map(([Name, Value]) => `${Name}="${Value}"`)
    .join(' ');
  const ShapeMarkup = Definition.Shapes
    .map(({ TagName, Attributes }) => {
      const ShapeAttributes = Object.entries(Attributes)
        .map(([Name, Value]) => `${Name}="${Value}"`)
        .join(' ');
      return `<${TagName} ${ShapeAttributes}></${TagName}>`;
    })
    .join('');
  return `<svg ${AttributeMarkup}>${ShapeMarkup}</svg>`;
};

export const EmbedIconSVGMarkup = BuildSVGMarkup(EmbedIconDefinition);
export const OpenIconSVGMarkup = BuildSVGMarkup(OpenIconDefinition);

/**
* Creates the embed icon as an SVG element for direct DOM insertion.
*
* @param {Document} DocumentRef Active document reference used for element creation.
* @returns {SVGSVGElement} - Embed icon as an SVG element.
*/
export const CreateEmbedIconSVGElement = (DocumentRef: Document): SVGSVGElement => {
  return BuildSVGElement(DocumentRef, EmbedIconDefinition);
};

/**
* Creates the open action icon as an SVG element for direct DOM insertion.
*
* @param {Document} DocumentRef Active document reference used for element creation.
* @returns {SVGSVGElement} - Open action icon as an SVG element.
*/
export const CreateOpenIconSVGElement = (DocumentRef: Document): SVGSVGElement => {
  return BuildSVGElement(DocumentRef, OpenIconDefinition);
};
