const db = require('../adapters/db')
const camelcaseKeys = require('camelcase-keys')
const snakecaseKeys = require('snakecase-keys')

async function validateClient (id, secret) {
  const sql = `SELECT id, secret FROM allowed_clients WHERE id = $1 AND secret = $2`
  const data = await db.manyOrNone(sql, [id, secret])

  if(!data || data.length < 1) {
    throw new Error('Not a recognized consumer')
  }

  return true
}

module.exports = {
  validateClient
}