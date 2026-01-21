import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const emptyForm = {
  title: "",
  description: "",
  address: "",
  city: "",
  state: "",
  location: "",
  type: "rent",
  price: "",
  bedrooms: "",
  bathrooms: "",
  sqft: "",
  parking: "",
  features: [],
  amenities: [],
  status: "active",
};

const statusOptions = ["active", "pending", "archived"];
const featureOptions = [
  "Hardwood Floors Throughout",
  "Granite Countertops",
  "Stainless Steel Appliances",
  "Walk-in Closets",
  "Central Air Conditioning",
  "Smart Home Technology",
  "Energy-Efficient Windows",
  "High Ceilings",
  "Recessed Lighting",
  "Crown Molding",
  "Updated Electrical System",
  "Modern Plumbing",
];
const amenityOptions = [
  "Swimming Pool",
  "Fitness Center",
  "Private Parking",
  "Garden/Yard",
  "Balcony/Terrace",
  "Fireplace",
  "High-Speed Internet",
  "Security System",
  "Washer/Dryer",
  "Storage Space",
  "Pet Friendly",
  "24/7 Concierge",
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);

function saveAuth(session) {
  localStorage.setItem("admin_session", JSON.stringify(session));
}

function readAuth() {
  try {
    return JSON.parse(localStorage.getItem("admin_session"));
  } catch (error) {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem("admin_session");
}

async function apiRequest(path, { token, ...options }) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      (response.status === 401
        ? "Unauthorized. Check your credentials."
        : "Something went wrong.");
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function Login({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const session = {
        token: data.token,
        expiresAt: data.expires_at,
        email,
      };
      saveAuth(session);
      onSuccess(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark"></div>
          <h1>Suteerth Admin</h1>
          <p>
            Manage premium property inventory, approvals, and leasing signals in
            a single cockpit.
          </p>
          <div className="login-meta">
            <span>Secure token access</span>
            <span>Listing lifecycle control</span>
            <span>Audit-friendly logs</span>
          </div>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <h2>Admin login</h2>
          <p>Use your credentials to continue.</p>
          </div>
          <label className="field">
            Email
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Access dashboard"}
          </button>
          <div className="helper">Need access? Reach out to the platform owner.</div>
        </form>
      </section>
    </div>
  );
}

function Sidebar({ session, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"></div>
        <div>
          <h1>Suteerth</h1>
          <span>Suteerth Admin Console</span>
        </div>
      </div>
      <div className="nav">
        <NavLink
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          to="/listings"
          end
        >
          Listings
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          to="/listings/new"
          end
        >
          Create Listing
        </NavLink>
        <NavLink
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          to="/enquiries"
        >
          Enquiries
        </NavLink>
      </div>
      <div className="sidebar-card">
        <strong>{session.email}</strong>
        <span>
          Token expires{" "}
          {session.expiresAt
            ? new Date(session.expiresAt * 1000).toLocaleString()
            : "soon"}
        </span>
        <button className="btn ghost" onClick={onLogout}>
          Log out
        </button>
      </div>
    </aside>
  );
}

function Layout({ session, onLogout, children }) {
  return (
    <div className="app-shell">
      <Sidebar session={session} onLogout={onLogout} />
      <main className="content">
        {children}
        <footer className="app-footer">
          <div className="brand">
            <div className="brand-mark"></div>
            <strong>Suteerth</strong>
          </div>
          <span>Admin console</span>
        </footer>
      </main>
    </div>
  );
}

function ListingForm({
  form,
  onChange,
  onFeaturesChange,
  onAmenitiesChange,
  onSubmit,
  onReset,
  loading,
  submitLabel,
}) {
  return (
    <form className="form" onSubmit={onSubmit}>
      <label className="field">
        Title
        <input name="title" value={form.title} onChange={onChange} required />
      </label>
      <label className="field">
        Description
        <textarea
          name="description"
          value={form.description}
          onChange={onChange}
          rows="3"
        />
      </label>
      <label className="field">
        Google Maps location URL
        <input
          name="location"
          value={form.location}
          onChange={onChange}
          placeholder="https://maps.google.com/?q=..."
        />
      </label>
      <label className="field">
        Listing type
        <select name="type" value={form.type} onChange={onChange}>
          <option value="rent">Rent</option>
          <option value="buy">Buy</option>
        </select>
      </label>
      <div className="field-row">
        <label className="field">
          Address
          <input
            name="address"
            value={form.address}
            onChange={onChange}
            required
          />
        </label>
        <label className="field">
          City
          <input name="city" value={form.city} onChange={onChange} required />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          State
          <input name="state" value={form.state} onChange={onChange} required />
        </label>
        <label className="field">
          Status
          <select name="status" value={form.status} onChange={onChange}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          Price
          <input
            name="price"
            type="number"
            value={form.price}
            onChange={onChange}
            required
          />
        </label>
        <label className="field">
          Bedrooms
          <input
            name="bedrooms"
            type="number"
            value={form.bedrooms}
            onChange={onChange}
            required
          />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          Bathrooms
          <input
            name="bathrooms"
            type="number"
            value={form.bathrooms}
            onChange={onChange}
            required
          />
        </label>
        <label className="field">
          Sqft
          <input
            name="sqft"
            type="number"
            value={form.sqft}
            onChange={onChange}
            required
          />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          Parking spots
          <input
            name="parking"
            type="number"
            value={form.parking}
            onChange={onChange}
          />
        </label>
        <label className="field">
          Status
          <select name="status" value={form.status} onChange={onChange}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          Property features
          <select
            multiple
            value={form.features}
            onChange={onFeaturesChange}
            className="multi-select"
          >
            {featureOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="helper">Select up to 12 features.</span>
        </label>
        <label className="field">
          Amenities
          <select
            multiple
            value={form.amenities}
            onChange={onAmenitiesChange}
            className="multi-select"
          >
            {amenityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="helper">Select amenities available on site.</span>
        </label>
      </div>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </button>
        <button className="btn ghost" type="button" onClick={onReset}>
          Clear
        </button>
      </div>
    </form>
  );
}

function ListingsPage({ session, onLogout }) {
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const navigate = useNavigate();

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return listings.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesQuery =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.city.toLowerCase().includes(query) ||
        item.state.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [listings, search, statusFilter]);

  const stats = useMemo(() => {
    const total = listings.length;
    const active = listings.filter((item) => item.status === "active").length;
    const avgPrice =
      total === 0
        ? 0
        : listings.reduce((sum, item) => sum + item.price, 0) / total;
    return { total, active, avgPrice };
  }, [listings]);

  const buildListQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));
    if (cityFilter.trim()) params.set("city", cityFilter.trim());
    if (minPrice) params.set("min_price", String(minPrice));
    if (maxPrice) params.set("max_price", String(maxPrice));
    if (search.trim()) params.set("q", search.trim());
    return params.toString();
  };

  const loadListings = async () => {
    setListLoading(true);
    setListError("");
    try {
      const data = await apiRequest(`/listings?${buildListQuery()}`, {
        method: "GET",
      });
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [page, perPage]);

  const applyFilters = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    loadListings();
  };

  return (
    <Layout session={session} onLogout={onLogout}>
      <section className="hero">
        <div>
          <h2>Listings overview</h2>
          <p>Monitor inventory and navigate to detailed listing views.</p>
        </div>
        <div className="hero-stats">
          <div>
            <span>Total listings</span>
            <strong>{stats.total}</strong>
          </div>
          <div>
            <span>Active</span>
            <strong>{stats.active}</strong>
          </div>
          <div>
            <span>Avg. price</span>
            <strong>{formatCurrency(stats.avgPrice)}</strong>
          </div>
        </div>
        <div className="hero-actions">
          <button className="btn secondary" onClick={loadListings}>
            Refresh listings
          </button>
          <button className="btn primary" onClick={() => navigate("/listings/new")}>
            New listing
          </button>
        </div>
      </section>

      <section className="panel">
        <header>
          <h3>Listings table</h3>
          <span className="chip">{filteredListings.length} items</span>
        </header>
        <div className="filters">
          <input
            type="search"
            placeholder="Search by title or city"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <input
            type="text"
            placeholder="City"
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="filters secondary">
          <input
            type="number"
            placeholder="Min price"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
          />
          <input
            type="number"
            placeholder="Max price"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
          />
          <select
            value={perPage}
            onChange={(event) => {
              setPerPage(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <button className="btn secondary" onClick={applyFilters}>
            Apply filters
          </button>
        </div>
        {listError ? <div className="error-banner">{listError}</div> : null}
        <div className="table">
          <div className="table-row table-head">
            <span>Listing</span>
            <span>Location</span>
            <span>Status</span>
            <span>Pricing</span>
            <span>Updated</span>
            <span>Actions</span>
          </div>
          {listLoading ? (
            <div className="empty-state">Loading listings...</div>
          ) : filteredListings.length === 0 ? (
            <div className="empty-state">
              <h4>No listings found</h4>
              <p>Adjust filters or create a new listing.</p>
            </div>
          ) : (
            filteredListings.map((listing) => (
              <div className="table-row" key={listing.id}>
                <div>
                  {listing.images?.length ? (
                    <img
                      className="listing-thumb"
                      src={listing.images[0]}
                      alt={listing.title}
                    />
                  ) : null}
                  <strong>{listing.title}</strong>
                  <span>{listing.description || "No description"}</span>
                </div>
                <div>
                  <span>{listing.address}</span>
                  <span>
                    {listing.city}, {listing.state}
                  </span>
                </div>
                <div>
                  <span className="pill">{listing.status}</span>
                </div>
                <div>
                  <strong>{formatCurrency(listing.price)}</strong>
                  <span>
                    {listing.bedrooms} bd • {listing.bathrooms} ba • {listing.sqft} sqft
                  </span>
                </div>
                <div>
                  <span>
                    {listing.updated_at
                      ? new Date(listing.updated_at).toLocaleDateString()
                      : "—"}
                  </span>
                  <span>
                    {listing.updated_at
                      ? new Date(listing.updated_at).toLocaleTimeString()
                      : ""}
                  </span>
                </div>
                <div className="table-actions">
                  <button
                    className="btn ghost"
                    onClick={() => navigate(`/listings/${listing.id}`, { state: listing })}
                  >
                    View
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => navigate(`/listings/${listing.id}`, { state: listing })}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="pagination">
          <button
            className="btn ghost"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1 || listLoading}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="btn ghost"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={listLoading}
          >
            Next
          </button>
        </div>
      </section>
    </Layout>
  );
}

function ListingCreatePage({ session, onLogout }) {
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeaturesChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value);
    setForm((prev) => ({ ...prev, features: values }));
  };

  const handleAmenitiesChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value);
    setForm((prev) => ({ ...prev, amenities: values }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setImageFiles([]);
    setImagePreviews([]);
  };

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [imagePreviews]);

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 7);
    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setImageFiles(files);
    setImagePreviews(
      files.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }))
    );
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("description", form.description.trim());
    formData.append("address", form.address.trim());
    formData.append("city", form.city.trim());
    formData.append("state", form.state.trim());
    formData.append("location", form.location.trim());
    formData.append("type", form.type);
    formData.append("price", String(form.price));
    formData.append("bedrooms", String(form.bedrooms));
    formData.append("bathrooms", String(form.bathrooms));
    formData.append("sqft", String(form.sqft));
    formData.append("parking", String(form.parking || 0));
    formData.append("status", form.status);
    formData.append("features", JSON.stringify(form.features));
    formData.append("amenities", JSON.stringify(form.amenities));
    imageFiles.forEach((file) => formData.append("images", file));
    return formData;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await apiRequest("/admin/listings", {
        method: "POST",
        token: session.token,
        body: buildFormData(),
      });
      setMessage("Listing created.");
      resetForm();
      navigate("/listings");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout session={session} onLogout={onLogout}>
      <section className="hero">
        <div>
          <h2>Create listing</h2>
          <p>Add a new property listing for your admin portfolio.</p>
        </div>
        <div className="hero-actions">
          <button className="btn secondary" onClick={() => navigate("/listings")}
          >
            Back to listings
          </button>
        </div>
      </section>
      <section className="panel">
        <header>
          <h3>Listing details</h3>
          <span className="chip">Draft</span>
        </header>
        {message ? <div className="helper">{message}</div> : null}
        <div className="image-upload">
          <label className="field">
            Images (up to 7)
            <input
              type="file"
              accept="image/*"
              multiple
              className="file-input"
              onChange={handleImageChange}
            />
          </label>
          {imagePreviews.length > 0 ? (
            <div className="image-grid">
              {imagePreviews.map((preview) => (
                <div className="image-tile" key={preview.url}>
                  <img src={preview.url} alt={preview.name} />
                  <span>{preview.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="helper">Upload up to 7 images to preview here.</div>
          )}
        </div>
        <ListingForm
          form={form}
          onChange={handleChange}
          onFeaturesChange={handleFeaturesChange}
          onAmenitiesChange={handleAmenitiesChange}
          onSubmit={handleSubmit}
          onReset={resetForm}
          loading={loading}
          submitLabel="Create listing"
        />
      </section>
    </Layout>
  );
}

function ListingDetailPage({ session, onLogout }) {
  const { id } = useParams();
  const location = useLocation();
  const [listing, setListing] = useState(() => location.state || null);
  const [form, setForm] = useState(() =>
    location.state
      ? {
          title: location.state.title || "",
          description: location.state.description || "",
          address: location.state.address || "",
          city: location.state.city || "",
          state: location.state.state || "",
          location: location.state.location || "",
          type: location.state.type || "rent",
          price: location.state.price || "",
          bedrooms: location.state.bedrooms || "",
          bathrooms: location.state.bathrooms || "",
          sqft: location.state.sqft || "",
          parking: location.state.parking || "",
          features: location.state.features || [],
          amenities: location.state.amenities || [],
          status: location.state.status || "active",
        }
      : emptyForm
  );
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const populateForm = (data) => {
    setListing(data);
    setForm({
      title: data.title || "",
      description: data.description || "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      location: data.location || "",
      type: data.type || "rent",
      price: data.price || "",
      bedrooms: data.bedrooms || "",
      bathrooms: data.bathrooms || "",
      sqft: data.sqft || "",
      parking: data.parking || "",
      features: data.features || [],
      amenities: data.amenities || [],
      status: data.status || "active",
    });
    const images = data.images || [];
    setImageFiles(new Array(images.length).fill(null));
    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setImagePreviews(new Array(images.length).fill(null));
  };

  const loadListing = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest(`/admin/listings/${id}`, {
        method: "GET",
        token: session.token,
      });
      populateForm(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListing();
  }, [id]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => {
        if (preview?.url) URL.revokeObjectURL(preview.url);
      });
    };
  }, [imagePreviews]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeaturesChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value);
    setForm((prev) => ({ ...prev, features: values }));
  };

  const handleAmenitiesChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value);
    setForm((prev) => ({ ...prev, amenities: values }));
  };

  const handleImageReplace = (index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
    setImagePreviews((prev) => {
      const next = [...prev];
      if (next[index]?.url) URL.revokeObjectURL(next[index].url);
      next[index] = { url: URL.createObjectURL(file), name: file.name };
      return next;
    });
  };

  const handleImageAdd = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 7);
    imagePreviews.forEach((preview) => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    });
    setImageFiles(files);
    setImagePreviews(
      files.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
      }))
    );
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const hasImageUpdates = imageFiles.some((file) => Boolean(file));
      if (hasImageUpdates) {
        const formData = new FormData();
        formData.append("title", form.title);
        formData.append("description", form.description);
        formData.append("address", form.address);
        formData.append("city", form.city);
        formData.append("state", form.state);
        formData.append("location", form.location);
        formData.append("type", form.type);
        formData.append("price", String(form.price));
        formData.append("bedrooms", String(form.bedrooms));
        formData.append("bathrooms", String(form.bathrooms));
        formData.append("sqft", String(form.sqft));
        formData.append("parking", String(form.parking || 0));
        formData.append("status", form.status);
        formData.append("features", JSON.stringify(form.features));
        formData.append("amenities", JSON.stringify(form.amenities));

        const existingImages = listing?.images || [];
        if (existingImages.length > 0) {
          existingImages.forEach((url, index) => {
            const file = imageFiles[index];
            if (file) {
              formData.append("images", file);
            } else {
              formData.append("images", url);
            }
          });
        } else {
          imageFiles.forEach((file) => formData.append("images", file));
        }

        await apiRequest(`/admin/listings/${id}`, {
          method: "PATCH",
          token: session.token,
          body: formData,
        });
      } else {
        await apiRequest(`/admin/listings/${id}`, {
          method: "PATCH",
          token: session.token,
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            address: form.address,
            city: form.city,
            state: form.state,
            location: form.location,
            type: form.type,
            price: Number(form.price),
            bedrooms: Number(form.bedrooms),
            bathrooms: Number(form.bathrooms),
            sqft: Number(form.sqft),
            parking: Number(form.parking || 0),
            features: form.features,
            amenities: form.amenities,
            status: form.status,
          }),
        });
      }
      setMessage("Listing updated.");
      await loadListing();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this listing?");
    if (!confirmed) return;
    setLoading(true);
    try {
      await apiRequest(`/admin/listings/${id}`, {
        method: "DELETE",
        token: session.token,
      });
      navigate("/listings");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout session={session} onLogout={onLogout}>
      <section className="hero">
        <div>
          <h2>Listing details</h2>
          <p>Review and update listing information.</p>
        </div>
        <div className="hero-actions">
          <button className="btn secondary" onClick={() => navigate("/listings")}
          >
            Back to listings
          </button>
          <button className="btn danger" onClick={handleDelete} disabled={loading}>
            Delete listing
          </button>
        </div>
      </section>
      <section className="panel">
        <header>
          <h3>Listing profile</h3>
          <span className="chip">{id}</span>
        </header>
        {error ? <div className="error-banner">{error}</div> : null}
        {message ? <div className="helper">{message}</div> : null}
        {listing ? (
          <div className="detail-grid">
            <div className="detail-card">
              <h4>{listing.title || "Listing"}</h4>
              <p>
                {listing.address} · {listing.city}, {listing.state}
              </p>
              {listing.location ? (
                <a className="link" href={listing.location} target="_blank" rel="noreferrer">
                  View on Google Maps
                </a>
              ) : null}
              <div className="tag-group">
                {(listing.features || []).map((feature) => (
                  <span className="tag" key={feature}>{feature}</span>
                ))}
              </div>
              <div className="tag-group">
                {(listing.amenities || []).map((amenity) => (
                  <span className="tag muted" key={amenity}>{amenity}</span>
                ))}
              </div>
            </div>
            <div className="detail-card">
              <h4>Pricing</h4>
              <p>{formatCurrency(listing.price)}</p>
              <p>
                {listing.bedrooms} bd · {listing.bathrooms} ba · {listing.sqft} sqft
              </p>
              <p>Parking: {listing.parking || 0} spots</p>
            </div>
          </div>
        ) : null}
        {listing?.images?.length ? (
          <div className="image-grid editable">
            {listing.images.map((url, index) => (
              <label className="image-tile editable" key={url}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleImageReplace(index, event)}
                />
                <img
                  src={imagePreviews[index]?.url || url}
                  alt={`Listing ${index + 1}`}
                />
                <span>Click to replace</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="image-upload">
            <label className="field">
              Upload images (up to 7)
              <input
                type="file"
                accept="image/*"
                multiple
                className="file-input"
                onChange={handleImageAdd}
              />
            </label>
            {imagePreviews.length > 0 ? (
              <div className="image-grid">
                {imagePreviews.map((preview) => (
                  <div className="image-tile" key={preview.url}>
                    <img src={preview.url} alt={preview.name} />
                    <span>{preview.name}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
        {loading && !listing ? (
          <div className="empty-state">Loading listing...</div>
        ) : (
          <ListingForm
            form={form}
            onChange={handleChange}
            onFeaturesChange={handleFeaturesChange}
            onAmenitiesChange={handleAmenitiesChange}
            onSubmit={handleUpdate}
            onReset={loadListing}
            loading={loading}
            submitLabel="Save changes"
          />
        )}
      </section>
    </Layout>
  );
}

function EnquiriesPage({ session, onLogout }) {
  const [enquiries, setEnquiries] = useState([]);
  const [listingIdFilter, setListingIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));
    if (listingIdFilter.trim()) params.set("listing_id", listingIdFilter.trim());
    return params.toString();
  };

  const loadEnquiries = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest(`/admin/enquiries?${buildQuery()}`, {
        method: "GET",
        token: session.token,
      });
      setEnquiries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, [page, perPage]);

  return (
    <Layout session={session} onLogout={onLogout}>
      <section className="hero">
        <div>
          <h2>Listing enquiries</h2>
          <p>Review inbound requests and follow up with prospective buyers.</p>
        </div>
        <div className="hero-actions">
          <button className="btn secondary" onClick={loadEnquiries}>
            Refresh enquiries
          </button>
        </div>
      </section>

      <section className="panel">
        <header>
          <h3>Enquiries</h3>
          <span className="chip">{enquiries.length} items</span>
        </header>
        <div className="filters">
          <input
            placeholder="Filter by listing id"
            value={listingIdFilter}
            onChange={(event) => setListingIdFilter(event.target.value)}
          />
          <select
            value={perPage}
            onChange={(event) => {
              setPerPage(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <button
            className="btn secondary"
            onClick={() => {
              if (page !== 1) {
                setPage(1);
                return;
              }
              loadEnquiries();
            }}
          >
            Apply
          </button>
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <div className="table">
          <div className="table-row table-head enquiries">
            <span>Sender</span>
            <span>Listing</span>
            <span>Message</span>
            <span>Created</span>
            <span>Actions</span>
          </div>
          {loading ? (
            <div className="empty-state">Loading enquiries...</div>
          ) : enquiries.length === 0 ? (
            <div className="empty-state">
              <h4>No enquiries found</h4>
              <p>Check your listing filter or refresh.</p>
            </div>
          ) : (
            enquiries.map((enquiry) => (
              <div className="table-row enquiries" key={enquiry.id}>
                <div>
                  <strong>{enquiry.name}</strong>
                  <span>{enquiry.email}</span>
                  <span>{enquiry.phone}</span>
                </div>
                <div>
                  <span>{enquiry.listing_id}</span>
                </div>
                <div>
                  <span>{enquiry.message}</span>
                </div>
                <div>
                  <span>
                    {enquiry.created_at
                      ? new Date(enquiry.created_at).toLocaleDateString()
                      : "—"}
                  </span>
                  <span>
                    {enquiry.created_at
                      ? new Date(enquiry.created_at).toLocaleTimeString()
                      : ""}
                  </span>
                </div>
                <div className="table-actions">
                  <button
                    className="btn ghost"
                    onClick={() => navigate(`/enquiries/${enquiry.id}`)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="pagination">
          <button
            className="btn ghost"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="btn ghost"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={loading}
          >
            Next
          </button>
        </div>
      </section>
    </Layout>
  );
}

function EnquiryDetailPage({ session, onLogout }) {
  const { id } = useParams();
  const [enquiry, setEnquiry] = useState(null);
  const [message, setMessage] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadEnquiry = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest(`/admin/enquiries/${id}`, {
        method: "GET",
        token: session.token,
      });
      setEnquiry(data);
      setUpdateMessage(data.message || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiry();
  }, [id]);

  const handleUpdate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await apiRequest(`/admin/enquiries/${id}`, {
        method: "PATCH",
        token: session.token,
        body: JSON.stringify({ message: updateMessage }),
      });
      setMessage("Enquiry updated.");
      await loadEnquiry();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this enquiry?");
    if (!confirmed) return;
    setLoading(true);
    setMessage("");
    try {
      await apiRequest(`/admin/enquiries/${id}`, {
        method: "DELETE",
        token: session.token,
      });
      navigate("/enquiries");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout session={session} onLogout={onLogout}>
      <section className="hero">
        <div>
          <h2>Enquiry detail</h2>
          <p>See the full message and update follow-up notes.</p>
        </div>
        <div className="hero-actions">
          <button className="btn secondary" onClick={() => navigate("/enquiries")}
          >
            Back to enquiries
          </button>
          <button className="btn danger" onClick={handleDelete} disabled={loading}>
            Delete enquiry
          </button>
        </div>
      </section>
      <section className="panel">
        <header>
          <h3>Enquiry profile</h3>
          <span className="chip">{id}</span>
        </header>
        {error ? <div className="error-banner">{error}</div> : null}
        {message ? <div className="helper">{message}</div> : null}
        {loading && !enquiry ? (
          <div className="empty-state">Loading enquiry...</div>
        ) : (
          <div className="detail-grid">
            <div className="detail-card">
              <h4>{enquiry?.name || "—"}</h4>
              <p>{enquiry?.email || ""}</p>
              <p>{enquiry?.phone || ""}</p>
              <span className="pill">Listing: {enquiry?.listing_id || "—"}</span>
            </div>
            <form className="form" onSubmit={handleUpdate}>
              <label className="field">
                Message
                <textarea
                  rows="6"
                  value={updateMessage}
                  onChange={(event) => setUpdateMessage(event.target.value)}
                />
              </label>
              <div className="actions">
                <button className="btn primary" type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save update"}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </Layout>
  );
}

function LoginPage({ session, onAuth }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate("/listings", { replace: true });
    }
  }, [session, navigate]);

  const handleSuccess = (session) => {
    onAuth(session);
    navigate("/listings", { replace: true });
  };

  return <Login onSuccess={handleSuccess} />;
}

function RequireAuth({ session, children }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [session, setSession] = useState(() => {
    const saved = readAuth();
    if (!saved) return null;
    if (saved.expiresAt && Date.now() / 1000 > saved.expiresAt) {
      clearAuth();
      return null;
    }
    return saved;
  });

  const handleLogout = () => {
    clearAuth();
    setSession(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            session ? (
              <Navigate to="/listings" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/login"
          element={<LoginPage session={session} onAuth={setSession} />}
        />
        <Route
          path="/listings"
          element={
            <RequireAuth session={session}>
              <ListingsPage session={session} onLogout={handleLogout} />
            </RequireAuth>
          }
        />
        <Route
          path="/listings/new"
          element={
            <RequireAuth session={session}>
              <ListingCreatePage session={session} onLogout={handleLogout} />
            </RequireAuth>
          }
        />
        <Route
          path="/listings/:id"
          element={
            <RequireAuth session={session}>
              <ListingDetailPage session={session} onLogout={handleLogout} />
            </RequireAuth>
          }
        />
        <Route
          path="/enquiries"
          element={
            <RequireAuth session={session}>
              <EnquiriesPage session={session} onLogout={handleLogout} />
            </RequireAuth>
          }
        />
        <Route
          path="/enquiries/:id"
          element={
            <RequireAuth session={session}>
              <EnquiryDetailPage session={session} onLogout={handleLogout} />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
