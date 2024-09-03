export default function TabPanel({ children, hidden }) {
    return (
        <div hidden={hidden}>
            {children}
        </div>
    );
}
