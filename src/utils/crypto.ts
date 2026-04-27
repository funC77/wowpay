export async function md5(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function generateSign(merchantNum: string, orderNo: string, amount: string | number, notifyUrl: string, apiSecret: string): Promise<string> {
  const signStr = `${merchantNum}${orderNo}${amount}${notifyUrl}${apiSecret}`;
  return md5(signStr);
}

export function verifyNotifySign(merchantNum: string, orderNo: string, platformOrderNo: string, apiSecret: string, sign: string): Promise<boolean> {
  const signStr = `${merchantNum}${orderNo}${platformOrderNo}${apiSecret}`;
  return md5(signStr).then(computed => computed === sign.toLowerCase());
}
