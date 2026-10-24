// Keep spreadsheet support in its own lazy-loaded chunk and expose only the
// SheetJS APIs used by this app so the production bundler can tree-shake it.
export { read, SSF, utils, writeFileXLSX } from 'xlsx';
