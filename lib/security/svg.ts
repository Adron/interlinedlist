/**
 * Conservative detection of active content in SVG uploads.
 *
 * SVGs are XML and can carry scripts / event handlers / external entities. When
 * a stored SVG is served inline, that content can execute. We reject SVGs that
 * contain obvious script vectors rather than attempting full sanitization.
 */

const ACTIVE_CONTENT = [
  /<\s*script/i,
  /<\s*foreignObject/i,
  /<\s*iframe/i,
  /<\s*embed/i,
  /<\s*object/i,
  /\son\w+\s*=/i, // event handler attributes: onload=, onclick=, ...
  /javascript:/i,
  /<!ENTITY/i, // external entity / XXE
  /<!DOCTYPE[^>]+\[/i, // internal DTD subset (entity definitions)
];

/** True if the SVG markup contains script/handler/entity vectors. */
export function svgHasActiveContent(svg: string): boolean {
  return ACTIVE_CONTENT.some((re) => re.test(svg));
}
