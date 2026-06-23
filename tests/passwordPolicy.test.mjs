import assert from 'node:assert/strict'
import { passwordPolicyMessage, validPassword } from '../src/utils/passwordPolicy.ts'

assert.equal(validPassword('Coms123!'), true)
assert.equal(validPassword('short1!'), false)
assert.equal(validPassword('ComsPassword!'), false)
assert.equal(validPassword('Coms1234'), false)
assert.equal(validPassword('Coms 123!'), false)

assert.equal(passwordPolicyMessage('Coms123!'), '')
assert.equal(
  passwordPolicyMessage('Coms1234'),
  '새 비밀번호는 8자 이상, 영문·숫자·특수문자를 모두 포함하고 공백이 없어야 합니다.',
)

console.log('password policy contract passed')
