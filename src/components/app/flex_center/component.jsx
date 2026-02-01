export function FlexCenter({ children, fullHeight = false }) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: fullHeight ? "100vh" : "auto",
            }}
        >
            {children}
        </div>
    );
}
