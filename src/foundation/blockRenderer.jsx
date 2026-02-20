import { createRef, Fragment, useRef, useState } from "react";
import { PageBlockWrapperComponent } from "../components/app/pageblock_wrapper/component.jsx";
import { BLOCK_TYPE_REGISTRY } from "./page/typeRegistry.mjs";
import { getCleanNetworkBlockData } from "./page/localPageNetHandler.js";

export function renderBlock(blockId, data, children, pageRef, blockRef) {
    const Component = BLOCK_TYPE_REGISTRY[data.type]?.component;
    if (Component) {
        return (
            <Component
                blockRef={blockRef}
                blockId={blockId}
                pageRef={pageRef}
                data={data}
            >
                {" "}
                {children}{" "}
            </Component>
        );
    }
    return (
        <p>
            Unknown block! "{JSON.stringify(getCleanNetworkBlockData(data))}"!
        </p>
    );
}

export function renderChildrenForBlock(blockId, children, content, pageRef) {
    //Find the type of the block and its definiton in the registry, looking for the childSorting property
    const blockType = BLOCK_TYPE_REGISTRY[content[blockId]?.type];
    const childSorting = blockType?.childSorting;

    if (childSorting) {
        console.log("Sorting children for block", blockId, children);
        //if there is sorting, ensure we create a new array to avoid mutating the original content,
        children = [...children];
        //and then sort the children using the provided sorting function, getting the content from each node
        children.sort((childA, childB) => {
            const childAContent = pageRef.current.content[childA.blockId];
            const childBContent = pageRef.current.content[childB.blockId];
            const result = childSorting(childAContent, childBContent);
            console.log(
                "Comparing children",
                childA.blockId,
                childAContent,
                "and",
                childB.blockId,
                childBContent,
                "result:",
                result,
            );
            return result;
        });
        console.log("Sorted children for block", children);
    }
    return renderChildBlocks(children, content, pageRef);
}

//Component which was originally just inline in the map call
//Now has the render children key state for calling renderChildrenForBlock again when data (and therefore order) may have changed
function StructureNodeComponent({ block, content, pageRef }) {
    if (!pageRef.current.content[block.blockId]) {
        pageRef.current.content[block.blockId] = {};
        console.warn("Missing content for blockId:", block.blockId);
    }
    // Each block gets its own ref
    const blockRef = useRef(null);
    pageRef.current.content[block.blockId].ref = blockRef;

    //New functionality here:
    // Add a re-render children method, which just increments the key of the fragment wrapping the render children call
    const [renderChildrenKey, setRenderChildrenKey] = useState(0);
    function triggerRerenderChildren() {
        setRenderChildrenKey(renderChildrenKey + 1);
    }
    pageRef.current.content[block.blockId].triggerRerenderChildren =
        triggerRerenderChildren;

    return (
        <PageBlockWrapperComponent
            key={block.blockId}
            pageRef={pageRef}
            blockId={block.blockId}
            wrapperRef={blockRef}
        >
            {/* Ensure that react will look for when renderChildrenKey changes value*/}
            {renderChildrenForBlock(
                block.blockId,
                block.children,
                content,
                pageRef,
            )}
        </PageBlockWrapperComponent>
    );
}

export function renderChildBlocks(children, content, pageRef) {
    if (children === undefined || children.length === 0) {
        return null;
    }

    return (
        <div>
            {children.map((block) => (
                <StructureNodeComponent
                    block={block}
                    pageRef={pageRef}
                    content={content}
                    key={block.blockId}
                />
            ))}
        </div>
    );
}
