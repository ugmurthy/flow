import React, { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow ,useNodeId} from '@xyflow/react';

function Leaf({ data }) {
  const [inputText,setInputText] = useState("");
  const {updateNodeData} = useReactFlow();
  const nodeId = useNodeId();
  
  const handleUpdateNode = useCallback(()=>{
    console.log("NodeUpdate", nodeId, inputText)
    if (nodeId) {
      updateNodeData([{id:nodeId, data:{inpTxt:"This is good"}}])
    }
  },[updateNodeData])

  const onChange = useCallback((evt) =>{
      const inpTxt = evt.target.value;
      console.log("onChange nodeid,inpTxt, inputText :",nodeId,inpTxt,inputText)
      setInputText(inpTxt);
      updateNodeData(nodeId, {inpTxt:inpTxt});
  },[])
  

  //console.log("Leaf ", data)

  return (
    <div className="px-4 py-2 shadow-md rounded-md border-2 border-stone-400">
      <div className="flex">
        <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100">
          {data.emoji}
        </div>
        <div className="ml-2" onClick={handleUpdateNode}>
          <div className="text-lg font-bold">{data.label}</div>
          <div className="text-gray-500">{data.function}</div>
        </div>

      </div>
      <pre className="text-green-700 text-xs font-thin">{data.inpTxt}</pre>
      <div className="bg-gray-100">
        <input className="px-2  rounded-lg border-gray-200 border-2" id="text" name="text" onChange={onChange} />
      </div>
     
      <pre className='text-xs font-thin text-blue-300'>
          {nodeId}: {JSON.stringify(data,null,2)}
      </pre>
      <Handle
        type="source"
        position={Position.Top}
        
      ></Handle>
    </div>
  );
}

export default Leaf;
