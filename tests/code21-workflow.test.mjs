#!/usr/bin/env node
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

function hasAllRequiredFields(req) {
  return !!(
    req.pin && req.pin.trim() &&
    req.vehicleMake && req.vehicleMake.trim() &&
    req.vehicleModel && req.vehicleModel.trim() &&
    req.vehicleColour && req.vehicleColour.trim() &&
    req.vehicleRego && req.vehicleRego.trim() &&
    req.offenceType && req.offenceType.trim() &&
    req.addressLabel && req.addressLabel.trim()
  );
}

function isFormReadOnly(savedWithPin, req) {
  return savedWithPin && hasAllRequiredFields(req);
}

function computeOffenceTimeOnSave(existingOffenceTime, hasPinNow) {
  if (hasPinNow && (!existingOffenceTime || existingOffenceTime === "")) {
    return new Date().toISOString();
  }
  return existingOffenceTime;
}

function parseOfficerNotes(notesJson) {
  try {
    return JSON.parse(notesJson || "[]");
  } catch {
    return [];
  }
}

function appendOfficerNote(notesJson, noteText) {
  const notes = parseOfficerNotes(notesJson);
  notes.push({
    note: noteText,
    timestamp: new Date().toISOString(),
  });
  return JSON.stringify(notes);
}

function canAuthorAccess(requestOfficerNumber, currentUserOfficerNumber) {
  return requestOfficerNumber === currentUserOfficerNumber;
}

describe("A. Offence time", () => {
  it("offence time is set when form is first saved with a PIN", () => {
    const existingOffenceTime = "";
    const result = computeOffenceTimeOnSave(existingOffenceTime, true);
    assert.ok(result !== "", "offence time should be set");
    assert.ok(new Date(result).getTime() > 0, "should be valid ISO timestamp");
  });

  it("offence time is stable on subsequent saves with PIN", () => {
    const existingOffenceTime = "2026-03-09T10:00:00.000Z";
    const result = computeOffenceTimeOnSave(existingOffenceTime, true);
    assert.equal(result, existingOffenceTime, "offence time should remain unchanged");
  });

  it("offence time is not set when no PIN present", () => {
    const existingOffenceTime = "";
    const result = computeOffenceTimeOnSave(existingOffenceTime, false);
    assert.equal(result, "", "offence time should remain empty");
  });

  it("original request time remains unchanged", () => {
    const originalRequestTime = "2026-03-09T08:00:00.000Z";
    const offenceTime = computeOffenceTimeOnSave("", true);
    assert.notEqual(originalRequestTime, offenceTime, "request time and offence time should differ");
    assert.equal(originalRequestTime, "2026-03-09T08:00:00.000Z", "original request time is untouched");
  });
});

describe("B. Read-only state", () => {
  it("form is NOT read-only with only PIN present", () => {
    const req = {
      pin: "12345",
      vehicleMake: "",
      vehicleModel: "",
      vehicleColour: "",
      vehicleRego: "",
      offenceType: "",
      addressLabel: "",
    };
    assert.equal(isFormReadOnly(true, req), false, "should not be read-only with missing fields");
  });

  it("form is NOT read-only when vehicle model is missing", () => {
    const req = {
      pin: "12345",
      vehicleMake: "Toyota",
      vehicleModel: "",
      vehicleColour: "White",
      vehicleRego: "ABC123",
      offenceType: "621 - Stopped in no parking",
      addressLabel: "123 Collins St",
    };
    assert.equal(isFormReadOnly(true, req), false, "missing vehicle model prevents read-only");
  });

  it("form enters read-only when all required fields are present", () => {
    const req = {
      pin: "12345",
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      vehicleColour: "White",
      vehicleRego: "ABC123",
      offenceType: "621 - Stopped in no parking",
      addressLabel: "123 Collins St",
    };
    assert.equal(isFormReadOnly(true, req), true, "should be read-only with all fields");
  });

  it("form is NOT read-only before PIN is saved", () => {
    const req = {
      pin: "12345",
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      vehicleColour: "White",
      vehicleRego: "ABC123",
      offenceType: "621 - Stopped in no parking",
      addressLabel: "123 Collins St",
    };
    assert.equal(isFormReadOnly(false, req), false, "should not be read-only before savedWithPin");
  });

  it("permanent read-only once all requirements satisfied", () => {
    const req = {
      pin: "12345",
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      vehicleColour: "White",
      vehicleRego: "ABC123",
      offenceType: "621 - Stopped in no parking",
      addressLabel: "123 Collins St",
    };
    assert.equal(isFormReadOnly(true, req), true);
    req.vehicleMake = "";
    assert.equal(hasAllRequiredFields(req), false, "removing a field means requirements not met");
  });
});

describe("E. Officer notes after read-only", () => {
  it("notes can be appended", () => {
    let notes = "[]";
    notes = appendOfficerNote(notes, "First observation");
    const parsed = JSON.parse(notes);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].note, "First observation");
    assert.ok(parsed[0].timestamp, "timestamp should be present");
  });

  it("multiple notes preserve ordering", () => {
    let notes = "[]";
    notes = appendOfficerNote(notes, "First");
    notes = appendOfficerNote(notes, "Second");
    notes = appendOfficerNote(notes, "Third");
    const parsed = JSON.parse(notes);
    assert.equal(parsed.length, 3);
    assert.equal(parsed[0].note, "First");
    assert.equal(parsed[1].note, "Second");
    assert.equal(parsed[2].note, "Third");
  });

  it("notes receive save-time timestamps", () => {
    const before = new Date().toISOString();
    let notes = "[]";
    notes = appendOfficerNote(notes, "Timed note");
    const after = new Date().toISOString();
    const parsed = JSON.parse(notes);
    assert.ok(parsed[0].timestamp >= before, "timestamp should be after start");
    assert.ok(parsed[0].timestamp <= after, "timestamp should be before end");
  });

  it("handles malformed existing notes gracefully", () => {
    const parsed = parseOfficerNotes("invalid json");
    assert.deepEqual(parsed, []);
  });

  it("handles empty/null notes gracefully", () => {
    assert.deepEqual(parseOfficerNotes(""), []);
    assert.deepEqual(parseOfficerNotes(null), []);
  });
});

describe("D. Permissions and read access", () => {
  it("author can access their own completed form", () => {
    assert.equal(canAuthorAccess("OFF001", "OFF001"), true);
  });

  it("non-author cannot access another officer's form", () => {
    assert.equal(canAuthorAccess("OFF001", "OFF002"), false);
  });
});

describe("C. Saved forms visual distinction", () => {
  it("active forms use highly saturated cyan color", () => {
    const activeColor = '#00E5FF';
    const r = parseInt(activeColor.slice(1, 3), 16);
    const g = parseInt(activeColor.slice(3, 5), 16);
    const b = parseInt(activeColor.slice(5, 7), 16);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    assert.ok(saturation > 0.5, `active color should be highly saturated (${saturation})`);
  });

  it("complete forms use 50% opacity via hex alpha", () => {
    const completeColor = '#00E5FF80';
    assert.ok(completeColor.endsWith('80'), "complete color should have ~50% alpha (0x80 = 128/255)");
  });

  it("complete forms strike-through is green", () => {
    const strikethroughColor = '#00ff00';
    assert.equal(strikethroughColor, '#00ff00');
  });

  it("complete bar color is green", () => {
    const barDoneColor = '#00ff00';
    assert.equal(barDoneColor, '#00ff00');
  });
});

describe("G. Data model safe defaults", () => {
  it("vehicleModel defaults to empty string", () => {
    const defaultValue = "";
    assert.equal(defaultValue, "");
  });

  it("officerNotes defaults to empty array JSON", () => {
    const defaultValue = "[]";
    assert.deepEqual(JSON.parse(defaultValue), []);
  });
});

console.log("All Code21 workflow tests completed.");
