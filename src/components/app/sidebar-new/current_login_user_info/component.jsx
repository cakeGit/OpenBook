import { fetchApi } from "../../../../foundation/api.js";
import { useApi } from "../../../../foundation/useApiData.js";
import "./style.css";

export function CurrentLoginUserInfo() {
    //Make a request to the server to get current login user info
    const { data, loading, error } = useApi(async () => {
        return await fetchApi("get_current_user_info");
    });
    if (loading || error) return <></>;
    console.log("Current user info data:", data);
    return (
        <div className="current_login_user_info">
            {/* Google pretty much always blocks localhost from displaying the profile picture, so we add referrerpolicy="no-referrer", which basically hides the origin */}
            <img
                src={data.profile_picture_url}
                referrerPolicy="no-referrer"
                alt="Profile"
                className="current_login_user_profile_picture"
            />
            <div className="current_login_user_side">
                <div className="current_login_user_display_name">
                    {data.display_name}
                </div>
                <button
                    className="sign_out_button"
                    onClick={async () => {
                        await fetchApi("sign_out");
                        window.location.reload();
                    }}
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}
