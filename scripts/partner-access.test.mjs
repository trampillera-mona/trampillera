import test from "node:test";
import assert from "node:assert/strict";
import {createInvitationToken,hashInvitationToken,normalizePartnerEmail,isValidPartnerEmail,buildPartnerInvitationUrl} from "../app/partner-access.js";
test("invitation token is high entropy and stored as a one-way hash",()=>{const t=createInvitationToken();assert.match(t,/^[A-Za-z0-9_-]{40,60}$/);assert.equal(hashInvitationToken(t).length,64);assert.notEqual(hashInvitationToken(t),t);assert.notEqual(hashInvitationToken(t),hashInvitationToken(createInvitationToken()))});
test("malformed invitation tokens are rejected",()=>assert.throws(()=>hashInvitationToken("bad"),TypeError));
test("partner email is normalized and validated",()=>{assert.equal(normalizePartnerEmail(" Egor@Example.com "),"egor@example.com");assert.equal(isValidPartnerEmail("egor@example.com"),true);assert.equal(isValidPartnerEmail("bad"),false)});

test("partner invitation URLs use only a canonical HTTPS origin",()=>{const token=createInvitationToken();assert.equal(buildPartnerInvitationUrl("https://trampillera.com",token),"https://trampillera.com/city/workspace/#invite="+encodeURIComponent(token));assert.throws(()=>buildPartnerInvitationUrl("http://trampillera.com",token),TypeError);assert.throws(()=>buildPartnerInvitationUrl("https://attacker.example/path",token),TypeError);assert.throws(()=>buildPartnerInvitationUrl("https://user:pass@trampillera.com",token),TypeError);assert.throws(()=>buildPartnerInvitationUrl(undefined,token),TypeError)});
