/** Raw bytes must come from the server; parsed values cannot reconstruct a device payload. */
export function pointRawBytes(hex:unknown):number[]|undefined{
  if(typeof hex !== 'string' || hex.length % 2 || !/^[0-9a-f]*$/i.test(hex))return undefined
  return Array.from({length:hex.length/2},(_,index)=>parseInt(hex.slice(index*2,index*2+2),16))
}

/** Binary notation uses b7…b0 inside each byte; array element order is unrelated. */
export function byteBits(value:number){return Array.from({length:8},(_,index)=>({bit:7-index,on:Boolean(value & (1 << (7-index)))}))}
