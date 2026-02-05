import { CloneBlockOperation } from "../../../../backend/web/foundation_safe/page/pageOperations";

export function createCloneBlockHandler(blockId, pageRef, wrapperRef, highlightRef) {
    return (e) => {
        e.preventDefault();

        pageRef.current.performAndSendOperation(new CloneBlockOperation(blockId));
    };
}
