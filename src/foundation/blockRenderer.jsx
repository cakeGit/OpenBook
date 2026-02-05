import { createRef } from "react";
import { PageBlockWrapperComponent } from "../components/app/pageblock_wrapper/component.jsx";
import { BLOCK_TYPE_REGISTRY } from "./page/typeRegistry.mjs";
import { getCleanNetworkBlockData } from "./page/localPageNetHandler.js";

export function renderBlock(blockId, data, children, pageRef, blockRef) {
    const Component = BLOCK_TYPE_REGISTRY[data.type]?.component;
    if (Component) {
        return (
            <Component
                ref={blockRef}
                blockId={blockId}
                pageRef={pageRef}
                data={data}
            > {children} </Component>
        );
    }
    return (
        <p>Unknown block! "{JSON.stringify(getCleanNetworkBlockData(data))}"!</p>
    );
}

export function renderChildrenForBlock(blockId, children, content, pageRef) {
    return renderChildBlocks(children, content, pageRef);
}

export function renderChildBlocks(children, content, pageRef) {
    if (children === undefined || children.length === 0) {
        return null;
    }
    return (
        <div>
            {children.map((block) => {
                if (!pageRef.current.content[block.blockId]) {
                    pageRef.current.content[block.blockId] = {};
                    console.warn("Missing content for blockId:", block.blockId);
                }
                // Each block gets its own ref
                const blockRef =
                    pageRef.current.content[block.blockId].ref ||
                    createRef(null);
                pageRef.current.content[block.blockId].ref = blockRef;
                return (
                    <PageBlockWrapperComponent
                        key={block.blockId}
                        pageRef={pageRef}
                        blockId={block.blockId}
                        wrapperRef={blockRef}
                    >
                        {(() => {
                            return renderChildrenForBlock(
                                block.blockId,
                                block.children,
                                content,
                                pageRef
                            );
                        })()}
                    </PageBlockWrapperComponent>
                );
            })}
        </div>
    );
}
