import { sanitizeAndNormalizePhone } from "../src/lib/validations/auth";

console.log("== RUNNING SECURITY STATIC TESTS ==");

function testPhoneNormalization() {
  const t1 = sanitizeAndNormalizePhone("+55 (65) 9999-8888");
  if (t1 !== "65999998888") throw new Error("Falha 1");

  const t2 = sanitizeAndNormalizePhone("6599998888"); // Faltando o digito 9, 10 digitos
  if (t2 !== "65999998888") throw new Error("Falha 2");

  const t3 = sanitizeAndNormalizePhone("55 65 99999 8888"); // 55 misturado com DDD
  if (t3 !== "65999998888") throw new Error("Falha 3");

  console.log("✅ Phone normalization tests passed");
}

function testCheckoutChangeMath() {
  const totalAmount = 35.50;
  const changeFor = 50.00;

  const changeToReturn = changeFor - totalAmount;

  if (changeToReturn !== 14.50) throw new Error("Finance Logic Error 1");

  console.log("✅ Change amount math test passed");
}

try {
  testPhoneNormalization();
  testCheckoutChangeMath();
  console.log("All security logic tests passed.");
} catch (e) {
  console.error(e);
  process.exit(1);
}
