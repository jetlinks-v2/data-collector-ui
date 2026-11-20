/** 后端提供的算法说明；时间为相对起点的毫秒，未通过的样本不产生输出。 */
export interface ProcessorDocumentation {
  name:string
  description:string
  formula?:string
  inputTypes?:string[]
  symbols:Array<{symbol:string;description:string}>
  examples:Array<{
    parameters?:string
    samples:Array<{offsetMillis:number;input:number|boolean;accepted:boolean;output?:number|boolean|null}>
  }>
}
