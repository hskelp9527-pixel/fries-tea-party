// Media is static: a new voice file or model must not reload the page.
export default { server: { watch: { ignored: ['**/art/**', '**/audio/**'] } } }
