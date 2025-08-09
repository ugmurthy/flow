import { useCallback,memo } from "react";

function TextUpdateNode(props) {

  console.log("TextUpdateNode (props)",props)
  const onChange = useCallback((evt) => {
    console.log("TextUpdateNode", evt.target.value);
  }, []);
 
  return (
    <div className="text-updater-node ">
      <div className="bg-teal-100">
        <label htmlFor="text" className="text-green-500 font-thin text-sm">Text:</label>
        <input id="text" name="text" onChange={onChange} className="nodrag" />
      </div>
    </div>
  );
}

export default  memo(TextUpdateNode)

