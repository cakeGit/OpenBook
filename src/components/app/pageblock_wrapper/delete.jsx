import { DeleteBlockOperation } from "../../../../backend/web/foundation_safe/page/pageOperations";

export function createDeleteBlockHandler(blockId, pageRef, wrapperRef, highlightRef, setDeletePromptOpen) {
    return (e, forced) => {
        e?.preventDefault?.(); //Only if event exists

        if (!forced) {
            //Check for children of this block, if they exist, open the delete prompt
            if (pageRef.current.doesBlockHaveChildren(blockId)) {
                setDeletePromptOpen(true);
                return;
            }
        }

        pageRef.current.performAndSendOperation(new DeleteBlockOperation(blockId));
        pageRef.current.triggerStructureRerender();
    };
}
