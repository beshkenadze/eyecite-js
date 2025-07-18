// Check F. reporter structure
import { REPORTERS } from '../src/reporters-db'

console.log('F. reporter structure:')
if (REPORTERS['F.']) {
  console.log(JSON.stringify(REPORTERS['F.'], null, 2))
} else {
  console.log('F. reporter not found')
}

console.log('\nF. Supp. reporter structure:')
if (REPORTERS['F. Supp.']) {
  console.log(JSON.stringify(REPORTERS['F. Supp.'], null, 2))
} else {
  console.log('F. Supp. reporter not found')
}