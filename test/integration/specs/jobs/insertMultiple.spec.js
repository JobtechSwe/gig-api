const { expect } = require('chai')
const { useFakeTimers } = require('sinon')
const request = require('../../helpers/request')
const {
  sites: {
    gigstr: site
  }
} = require('../../config')

const psql = require('../../helpers/psql')
const generateJob = require('../../helpers/generateJob')

const jobsJSON = require('./jobs.fixture.json')

describe('jobs/insertMultiple', () => {
  let now, client

  before(async () => {
    client = psql()
    await client.connect()
    now = useFakeTimers(Date.now())
  })

  it('checks if there are any jobs in the database', async () => {
    const results = await client.query(`SELECT COUNT(*) FROM jobs;`)

    const { rows: [{ count }] } = results

    expect(count).to.eql('0')
  })

  it('inserts multiple jobs', async () => {
    const jobs = [...Array(12).keys()]
      .map(() => generateJob({
        company: site.name,
        source: site.name,
        from: now
      }))

    const response = await request({
      path: '/jobs',
      headers: {
        'client-id': site.id,
        'client-secret': site.secret
      },
      options: {
        method: 'POST',
        body: jobs
      }
    })

    expect(response.total).to.eql(12)

    await client.query(`TRUNCATE jobs CASCADE;`)
  })

  let jobs, expected
  before(async () => {
    jobs = jobsJSON.map(object => {
      return generateJob(Object.assign({}, {
        company: site.name,
        source: site.name,
        from: now
      }, object))
    })
    expected = jobs.find(job => job.address === 'Nils Ericsons Plan, Stockholm')
  })

  it('inserts multiple jobs and queries', async () => {
    const response = await request({
      path: '/jobs',
      headers: {
        'client-id': site.id,
        'client-secret': site.secret
      },
      options: {
        method: 'POST',
        body: jobs
      }
    })

    expect(response.total).to.eql(jobs.length)
  })

  it('gets the job using SQL (lat|lon)', async () => {
    const { rows: [ row ] } = await client.query(`
      SELECT
        * FROM jobs
        , earth_distance(
          ll_to_earth('${expected.latitude}', '${expected.longitude}'),
          ll_to_earth(jobs.latitude, jobs.longitude)
        ) AS distance
      WHERE
        end_date > now()
      ORDER BY
        distance ASC
      OFFSET '0'
      LIMIT '1';
    `)

    const { source_id: sourceId } = row

    expect(sourceId).to.eql(expected.sourceId)
  })

  it('gets the job closest to location', async () => {
    const { results: [ { sourceId } ] } = await request({
      path: `/jobs?longitude=${expected.longitude}&latitude=${expected.latitude}&pageLimit=1`
    })
    expect(sourceId).to.eql(expected.sourceId)
  })

  it('gets the job closest to location', async () => {
    const { longitude, latitude } = expected

    const params = `longitude=${longitude}&latitude=${latitude}&experience=2.12.90&orderBy=relevance&pageLimit=5`

    const { results } = await request({
      path: `/jobs?${params}`
    })

    console.log(results.map(({ experience, address }) => [experience, address]))
  })


  after(async () => {
    await client.query(`TRUNCATE jobs CASCADE;`)
    await client.end()
  })
})
