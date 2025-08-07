import { useCallback } from "react";

function Root(props) {
  console.log("Root node ",JSON.stringify(props,2,0));

  const onChange = useCallback((evt) => {
    console.log("Root", evt.target.value);
  }, []);
 
  return (
    <div className="">
      <div onClick={onChange}>
        <label>Root Node</label>
      </div>
    </div>
  );
}

export default  Root

