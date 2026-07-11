"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import SwaggerUI with no SSR
const SwaggerUI = dynamic(
  () => import("swagger-ui-react"),
  {
    ssr: false,
    loading: () => (
      <div className="loading">
        <div className="animate-pulse text-center">
          <div className="text-xl">Loading API documentation...</div>
          <div className="mt-4 text-gray-500">
            Please wait while we fetch the API specification
          </div>
        </div>
      </div>
    ),
  }
);

export default function ApiDocs() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    const fetchSpec = async () => {
      const response = await fetch("/api/swagger");
      const data = await response.json();
      setSpec(data);
    };

    fetchSpec();
  }, []);

  return (
    <div className="swagger-container">
      <div className="swagger-content">
        {spec ? (
          <SwaggerUI
            spec={spec}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            filter={true}
          />
        ) : (
          <div className="loading">
            <div className="animate-pulse text-center">
              <div className="text-xl">Loading API documentation...</div>
              <div className="mt-4 text-gray-500">
                Please wait while we fetch the API specification
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 30px 0;
        }
        .swagger-ui .scheme-container {
          background-color: transparent;
          box-shadow: none;
          padding-top: 0;
        }
        .swagger-ui table tbody tr td:first-of-type {
          max-width: 200px;
        }
        .swagger-ui .opblock .opblock-summary-description {
          text-align: right;
        }
        .swagger-ui .info .title {
          font-size: 2rem;
        }
        .loading {
          padding: 40px;
        }
      `}</style>
    </div>
  );
}
