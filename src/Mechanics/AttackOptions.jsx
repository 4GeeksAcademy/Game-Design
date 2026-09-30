function AttackOptions() {

// Temporarily hardcoded attacks to see if i can make it functional

    return (
        <div className="card" id="attack">

            <div className="card-header text-center">
                Attack Options
            </div>

            <div className="card-body">

                <div className="row">

                    <div className="col-md-3 mb-3">
                        <button className="btn btn-primary w-100">
                            Attack 1
                        </button>
                    </div>

                    <div className="col-md-3 mb-3">
                        <button className="btn btn-primary w-100">
                            Attack 2
                        </button>
                    </div>

                    <div className="col-md-3 mb-3">
                        <button className="btn btn-secondary w-100" disabled>
                            Attack 3
                        </button>
                    </div>

                    <div className="col-md-3 mb-3">
                        <button className="btn btn-secondary w-100" disabled>
                            Attack 4
                        </button>
                    </div>

                </div>

            </div>

        </div>
    );
}

export default AttackOptions;