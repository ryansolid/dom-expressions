import { Feature, Serializer } from "seroval"

const ES2017FLAG =
  Feature.AggregateError // ES2021
  | Feature.BigInt // ES2020
  | Feature.BigIntTypedArray // ES2020;

const GLOBAL_IDENTIFIER = '_$HY.r'; // TODO this is a pending name

export function createSerializer(onData) {
  return new Serializer({
    globalIdentifier: GLOBAL_IDENTIFIER,
    disabledFeatures: ES2017FLAG,
    onData,
  });
}

export function getHeaderScript() {
  return `var $R=[],$P=(e,$,r)=>((r=new Promise(((r,u)=>{e=r,$=u}))).s=e,r.f=$,r),$uP=(e,$)=>{delete($=$R[e]).s,delete $.f},$Ps=(e,$,r)=>{(r=$R[e]).s($),r.value=$,$uP(e)},$Pf=(e,$)=>{$R[e].f($),$uP(e)},$uS=e=>delete e.c,$Se=(e,$,r,u,s)=>{switch(s=(u=$R[e]).c,$){case 0:return s.enqueue(r);case 1:return s.error(r),$uS(u);case 2:return s.close(),$uS(u)}},$S=(e,$)=>((e=new ReadableStream({start(e){$=e}})).c=$,e);`
}
