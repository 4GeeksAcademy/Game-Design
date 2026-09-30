import Opponent from "./components/Opponent";
import Character from "./components/Character";
import AttackOptions from "./components/AttackOptions";

function App() {

    return (
        <div className="container mt-4">

            <Opponent />

            <Character />

            <AttackOptions />

        </div>
    );
}

export default App;