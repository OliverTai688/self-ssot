import assert from 'node:assert/strict'
import { createV5State } from '../src/lib/ui-data/yuanzhan/v5-state'
import { evaluateFormula } from '../src/lib/ui-data/yuanzhan/formulas'
const empty=createV5State('empty'),showcase=createV5State('showcase')
for(const value of Object.values(empty.data))if(Array.isArray(value))assert.equal(value.length,0)
assert.deepEqual(empty.data.journal,{})
assert.deepEqual(empty.data.repos,{})
assert.deepEqual(empty.data.capacity,{yz:[],lily:[]})
assert.deepEqual(empty.data.timesheet,{yz:[],lily:[]})
assert(!JSON.stringify(empty).includes('柏翰'))
assert.equal(showcase.data.projects.length,4)
assert.equal(showcase.data.events.length,8)
assert.equal(showcase.data.history.length,81)
assert.deepEqual(createV5State('showcase'),showcase)
showcase.data.projects[0].t='changed'
assert.notEqual(createV5State('showcase').data.projects[0].t,'changed')
assert.equal(evaluateFormula('=SUM(D1:D2)',{D1:10,D2:20}).value,30)
assert.equal(evaluateFormula('=D1',{D1:'=D1'}).error,'#CYCLE!')
console.log('PASS v5 empty all collections, source fixture cardinality, deterministic isolated factories, formula safety')
